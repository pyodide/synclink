import {
  Endpoint,
  EventSource,
  Message,
  MessageType,
  messageTypeSet,
  PostMessageWithOrigin,
  WireValue,
  WireValueType,
  wireValueTypeSet,
  StoreKey,
} from "./protocol";

import { requestResponseMessage } from "./request_response";

import {createEndpoint, Remote, releaseProxy} from "./types";
import { proxy } from "./transfer_handlers";
import {
  fromWireValue,
  toWireValue,
  transfer,
  throwMarker,
  storeCreate,
  storeGetValue,
  storeDeleteKey,
} from "./transfer_handlers";

import { SynclinkTask, syncResponse } from "./task";

function innerMessageHandler(obj_arg: any, ep: Endpoint, message: Message) {
  const { id, path, store_key } = {
    path: [] as string[],
    store_key: undefined,
    ...message,
  };
  let obj;
  if (store_key) {
    obj = storeGetValue(ep, store_key);
  } else {
    obj = obj_arg;
  }
  if (obj_arg === undefined && store_key === undefined) {
    console.warn(obj_arg, message);
    throw new Error("Internal synclink error!");
  }
  const argumentList = ((message as any).argumentList || []).map((v: any) => {
    if (v.type === WireValueType.PROXY) {
      return innerMessageHandler(obj_arg, ep, v.message);
    } else {
      return fromWireValue(ep, v);
    }
  });
  const last = path.pop();
  let parent = path.reduce((obj, prop) => obj[prop], obj);
  const rawValue = last ? parent[last] : obj;
  if (!last) {
    parent = undefined;
  }
  if (rawValue === undefined) {
    switch (message.type) {
      case MessageType.GET:
      case MessageType.SET:
        break;
      default:
        console.warn("Undefined", obj, path, last);
        throw new Error("undefined!!" + ` ${obj}, ${path}, ${last}`);
    }
  }
  switch (message.type) {
    case MessageType.GET:
      {
        return rawValue;
      }
      break;
    case MessageType.SET:
      {
        parent[last!] = fromWireValue(ep, message.value);
        return true;
      }
      break;
    case MessageType.APPLY:
      {
        if (last) {
          return parent[last].apply(parent, argumentList);
        } else {
          return rawValue.apply(parent, argumentList);
        }
      }
      break;
    case MessageType.CONSTRUCT:
      {
        const value = new rawValue(...argumentList);
        return proxy(value);
      }
      break;
    case MessageType.ENDPOINT:
      {
        const { port1, port2 } = new MessageChannel();
        expose(obj, port2);
        return transfer(port1, [port1]);
      }
      break;
    case MessageType.RELEASE:
      {
        return undefined;
      }
      break;
    case MessageType.DESTROY:
      {
        storeDeleteKey(ep, store_key!);
        return undefined;
      }
      break;
    default:
      return undefined;
  }
}

export function expose(obj_arg: any, ep: Endpoint = globalThis as any) {
  const wrap = false;
  exposeInner(obj_arg, ep, wrap);
}

function exposeInner(
  obj_arg: any,
  ep: Endpoint = globalThis as any,
  wrap: boolean,
) {
  storeCreate(ep);
  ep.addEventListener("message", async function callback(ev: MessageEvent) {
    if (!ev || !ev.data) {
      return;
    }
    if (!messageTypeSet.has(ev.data.type)) {
      if (!wireValueTypeSet.has(ev.data.type) && !ev.data.data_buffer) {
        console.warn("Internal error on message:", ev.data);
        throw new Error(
          `Synclink Internal error: Expected message.type to either be a MessageType or a WireValueType, got '${ev.data.type}'`,
        );
      }
      // It was a response.
      // TODO: assert that there is a requestResponseMessage waiting for this id?
      return;
    }
    const message = ev.data as Message;
    const { id, type, store_key } = { store_key: undefined, ...message };
    if (wrap && store_key === undefined) {
      // TODO: What are these messages doing?
      return;
    }
    const sync = ev.data.syncify;
    let returnValue;
    try {
      returnValue = innerMessageHandler(obj_arg, ep, message);
      if (returnValue && returnValue.then) {
        if (sync && ep._bypass) {
          throw new Error("Cannot use syncify with bypass on an async method");
        }
        returnValue = await returnValue;
      }
    } catch (value) {
      returnValue = { value, [throwMarker]: 0 };
    }
    const [wireValue, transferables] = toWireValue(ep, returnValue);
    if (sync) {
      syncResponse(ep, ev.data, wireValue);
    } else {
      ep.postMessage({ ...wireValue, id }, transferables);
    }
    if (type === MessageType.RELEASE) {
      // detach and deactivate after sending release response above.
      ep.removeEventListener("message", callback as any);
      closeEndPoint(ep);
    }
  } as any);
  if (ep.start) {
    ep.start();
  }
}

function isMessagePort(endpoint: Endpoint): endpoint is MessagePort {
  return endpoint.constructor.name === "MessagePort";
}

function closeEndPoint(endpoint: Endpoint) {
  if (isMessagePort(endpoint)) endpoint.close();
}

export function wrap<T>(ep: Endpoint, target?: any): Remote<T> {
  const wrap = true;
  exposeInner(undefined, ep, wrap);
  return createProxy<T>(ep, { target }) as any;
}

function throwIfProxyReleased(isReleased: boolean) {
  if (isReleased) {
    throw new Error("Proxy has been released and is not usable");
  }
}

export function createProxy<T>(
  ep: Endpoint,
  {
    store_key = undefined,
    path = [],
    target = function () {},
  }: {
    store_key?: StoreKey;
    path?: (string | number | symbol)[];
    target?: object;
  },
): Remote<T> {
  let isProxyReleased = false;
  const proxy = new Proxy(target, {
    get(_target, prop) {
      throwIfProxyReleased(isProxyReleased);
      switch (prop) {
        case "$$ep":
          return ep;
        case Symbol.toStringTag:
          return "SynclinkProxy";
        case releaseProxy:
          return () => {
            return new SynclinkTask(
              ep,
              {
                type: MessageType.RELEASE,
                path: path.map((p) => p.toString()),
              },
              [],
              () => {
                closeEndPoint(ep);
                isProxyReleased = true;
              },
            );
          };
        case "__destroy__":
          if (!store_key) {
            return () => {};
          }
          return () => {
            return new SynclinkTask(
              ep,
              {
                type: MessageType.DESTROY,
                store_key,
              },
              [],
              () => {
                isProxyReleased = true;
              },
            );
          };
        case "_as_message":
          return () => {
            return {
              type: MessageType.GET,
              store_key,
              path: path.map((p) => p.toString()),
            };
          };
        case "then":
        case "schedule_async":
        case "schedule_sync":
        case "syncify":
          if (path.length === 0 && prop === "then") {
            return { then: () => proxy };
          }
          let r = new SynclinkTask(
            ep,
            {
              type: MessageType.GET,
              store_key,
              path: path.map((p) => p.toString()),
            },
            [],
            undefined,
          );
          return r[prop].bind(r);
        default:
          return createProxy(ep, { store_key, path: [...path, prop] });
      }
    },
    set(_target, prop, rawValue) {
      throwIfProxyReleased(isProxyReleased);
      // FIXME: ES6 Proxy Handler `set` methods are supposed to return a
      // boolean. To show good will, we return true asynchronously ¯\_(ツ)_/¯
      const [value, transferables] = toWireValue(ep, rawValue);
      return requestResponseMessage(
        ep,
        {
          type: MessageType.SET,
          store_key,
          path: [...path, prop].map((p) => p.toString()),
          value,
        },
        transferables,
      ).then((v) => fromWireValue(ep, v)) as any;
    },
    apply(_target, _thisArg, rawArgumentList) {
      throwIfProxyReleased(isProxyReleased);
      const last = path[path.length - 1];
      if ((last as any) === createEndpoint) {
        return requestResponseMessage(ep, {
          type: MessageType.ENDPOINT,
        }).then((v) => fromWireValue(ep, v));
      }
      // We just pretend that `bind()` didn’t happen.
      if (last === "bind") {
        return createProxy(ep, { store_key, path: path.slice(0, -1) });
      }
      if (last === "apply") {
        // temporary hack...
        rawArgumentList = rawArgumentList[1];
        path = path.slice(0, -1);
      }
      const [argumentList, transferables] = processArguments(
        ep,
        rawArgumentList,
      );
      return new SynclinkTask(
        ep,
        {
          type: MessageType.APPLY,
          store_key,
          path: path.map((p) => p.toString()),
          argumentList,
        },
        transferables,
        undefined,
      );
    },
    construct(_target, rawArgumentList) {
      throwIfProxyReleased(isProxyReleased);
      const [argumentList, transferables] = processArguments(
        ep,
        rawArgumentList,
      );
      return requestResponseMessage(
        ep,
        {
          type: MessageType.CONSTRUCT,
          store_key,
          path: path.map((p) => p.toString()),
          argumentList,
        },
        transferables,
      ).then((v) => fromWireValue(ep, v));
    },
    ownKeys(_target) {
      return [];
    },
  });
  return proxy as any;
}

function myFlat<T>(arr: (T | T[])[]): T[] {
  return Array.prototype.concat.apply([], arr);
}

function processArguments(
  ep: Endpoint,
  argumentList: any[],
): [WireValue[], Transferable[]] {
  const processed = argumentList.map((v) => toWireValue(ep, v));
  return [processed.map((v) => v[0]), myFlat(processed.map((v) => v[1]))];
}

export function windowEndpoint(
  w: PostMessageWithOrigin,
  context: EventSource = self,
  targetOrigin = "*",
): Endpoint {
  return {
    postMessage: (msg: any, transferables: Transferable[]) =>
      w.postMessage(msg, targetOrigin, transferables),
    addEventListener: context.addEventListener.bind(context),
    removeEventListener: context.removeEventListener.bind(context),
  };
}
