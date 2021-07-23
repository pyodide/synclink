import {
  Endpoint,
  EventSource,
  Message,
  MessageType,
  PostMessageWithOrigin,
  WireValue,
  WireValueType,
  StoreKey,
} from "./protocol";

import { requestResponseMessage } from "./request_response";

import {
  fromWireValue,
  toWireValue,
  transfer,
  throwMarker,
  isObject,
  TransferHandler,
  storeCreate,
  storeGetValue,
  storeNewValue,
  storeDeleteKey,
} from "./transfer_handlers";

import { ComlinkTask, syncResponse } from "./comlink_task";

// import { syncRequest, syncResponse } from "./synclink";

export const createEndpoint = Symbol("Comlink.endpoint");
export const releaseProxy = Symbol("Comlink.releaseProxy");

/**
 * Takes a type and wraps it in a Promise, if it not already is one.
 * This is to avoid `Promise<Promise<T>>`.
 *
 * This is the inverse of `Unpromisify<T>`.
 */
type Promisify<T> = T extends Promise<unknown> ? T : Promise<T>;
/**
 * Takes a type that may be Promise and unwraps the Promise type.
 * If `P` is not a Promise, it returns `P`.
 *
 * This is the inverse of `Promisify<T>`.
 */
type Unpromisify<P> = P extends Promise<infer T> ? T : P;

/**
 * Takes the raw type of a remote property and returns the type that is visible to the local thread on the proxy.
 *
 * Note: This needs to be its own type alias, otherwise it will not distribute over unions.
 * See https://www.typescriptlang.org/docs/handbook/advanced-types.html#distributive-conditional-types
 */
type RemoteProperty<T> =
  // If the value is a method, comlink will proxy it automatically.
  // Objects are only proxied if they are marked to be proxied.
  // Otherwise, the property is converted to a Promise that resolves the cloned value.
  T extends Function | ProxyMarked ? Remote<T> : Promisify<T>;

/**
 * Takes the raw type of a property as a remote thread would see it through a proxy (e.g. when passed in as a function
 * argument) and returns the type that the local thread has to supply.
 *
 * This is the inverse of `RemoteProperty<T>`.
 *
 * Note: This needs to be its own type alias, otherwise it will not distribute over unions. See
 * https://www.typescriptlang.org/docs/handbook/advanced-types.html#distributive-conditional-types
 */
type LocalProperty<T> = T extends Function | ProxyMarked
  ? Local<T>
  : Unpromisify<T>;

/**
 * Proxies `T` if it is a `ProxyMarked`, clones it otherwise (as handled by structured cloning and transfer handlers).
 */
export type ProxyOrClone<T> = T extends ProxyMarked ? Remote<T> : T;
/**
 * Inverse of `ProxyOrClone<T>`.
 */
export type UnproxyOrClone<T> = T extends RemoteObject<ProxyMarked>
  ? Local<T>
  : T;

/**
 * Takes the raw type of a remote object in the other thread and returns the type as it is visible to the local thread
 * when proxied with `Comlink.proxy()`.
 *
 * This does not handle call signatures, which is handled by the more general `Remote<T>` type.
 *
 * @template T The raw type of a remote object as seen in the other thread.
 */
export type RemoteObject<T> = { [P in keyof T]: RemoteProperty<T[P]> };
/**
 * Takes the type of an object as a remote thread would see it through a proxy (e.g. when passed in as a function
 * argument) and returns the type that the local thread has to supply.
 *
 * This does not handle call signatures, which is handled by the more general `Local<T>` type.
 *
 * This is the inverse of `RemoteObject<T>`.
 *
 * @template T The type of a proxied object.
 */
export type LocalObject<T> = { [P in keyof T]: LocalProperty<T[P]> };

/**
 * Additional special comlink methods available on each proxy returned by `Comlink.wrap()`.
 */
export interface ProxyMethods {
  [createEndpoint]: () => Promise<MessagePort>;
  [releaseProxy]: () => void;
}

/**
 * Takes the raw type of a remote object, function or class in the other thread and returns the type as it is visible to
 * the local thread from the proxy return value of `Comlink.wrap()` or `Comlink.proxy()`.
 */
export type Remote<T> =
  // Handle properties
  RemoteObject<T> &
    // Handle call signature (if present)
    (T extends (...args: infer TArguments) => infer TReturn
      ? (
          ...args: { [I in keyof TArguments]: UnproxyOrClone<TArguments[I]> }
        ) => Promisify<ProxyOrClone<Unpromisify<TReturn>>>
      : unknown) &
    // Handle construct signature (if present)
    // The return of construct signatures is always proxied (whether marked or not)
    (T extends { new (...args: infer TArguments): infer TInstance }
      ? {
          new (
            ...args: {
              [I in keyof TArguments]: UnproxyOrClone<TArguments[I]>;
            }
          ): Promisify<Remote<TInstance>>;
        }
      : unknown) &
    // Include additional special comlink methods available on the proxy.
    ProxyMethods;

/**
 * Expresses that a type can be either a sync or async.
 */
type MaybePromise<T> = Promise<T> | T;

/**
 * Takes the raw type of a remote object, function or class as a remote thread would see it through a proxy (e.g. when
 * passed in as a function argument) and returns the type the local thread has to supply.
 *
 * This is the inverse of `Remote<T>`. It takes a `Remote<T>` and returns its original input `T`.
 */
export type Local<T> =
  // Omit the special proxy methods (they don't need to be supplied, comlink adds them)
  Omit<LocalObject<T>, keyof ProxyMethods> &
    // Handle call signatures (if present)
    (T extends (...args: infer TArguments) => infer TReturn
      ? (
          ...args: { [I in keyof TArguments]: ProxyOrClone<TArguments[I]> }
        ) => // The raw function could either be sync or async, but is always proxied automatically
        MaybePromise<UnproxyOrClone<Unpromisify<TReturn>>>
      : unknown) &
    // Handle construct signature (if present)
    // The return of construct signatures is always proxied (whether marked or not)
    (T extends { new (...args: infer TArguments): infer TInstance }
      ? {
          new (
            ...args: {
              [I in keyof TArguments]: ProxyOrClone<TArguments[I]>;
            }
          ): // The raw constructor could either be sync or async, but is always proxied automatically
          MaybePromise<Local<Unpromisify<TInstance>>>;
        }
      : unknown);

export function expose(obj_arg: any, ep: Endpoint = self as any) {
  storeCreate(ep);
  ep.addEventListener("message", async function callback(ev: MessageEvent) {
    if (!ev || !ev.data) {
      return;
    }
    const { id, type, path, store_key } = {
      path: [] as string[],
      ...(ev.data as Message),
    };
    let obj;
    if (store_key) {
      obj = storeGetValue(ep, store_key);
    } else {
      obj = obj_arg;
    }
    const argumentList = (ev.data.argumentList || []).map((v: any) =>
      fromWireValue(ep, v)
    );
    let returnValue;
    try {
      const last = path.pop();
      let parent = path.reduce((obj, prop) => obj[prop], obj);
      const rawValue = last ? parent[last] : parent;
      if (!last) {
        parent = undefined;
      }
      if (rawValue === undefined) {
        switch (type) {
          case MessageType.GET:
          case MessageType.SET:
            break;
          default:
            console.warn("Undefined", obj, path, last);
            throw new Error("undefined!!");
        }
      }
      switch (type) {
        case MessageType.GET:
          {
            returnValue = rawValue;
          }
          break;
        case MessageType.SET:
          {
            parent[last!] = fromWireValue(ep, ev.data.value);
            returnValue = true;
          }
          break;
        case MessageType.APPLY:
          {
            if (last) {
              returnValue = parent[last].apply(parent, argumentList);
            } else {
              returnValue = rawValue.apply(parent, argumentList);
            }
          }
          break;
        case MessageType.CONSTRUCT:
          {
            const value = new rawValue(...argumentList);
            returnValue = proxy(value);
          }
          break;
        case MessageType.ENDPOINT:
          {
            const { port1, port2 } = new MessageChannel();
            expose(obj, port2);
            returnValue = transfer(port1, [port1]);
          }
          break;
        case MessageType.RELEASE:
          {
            returnValue = undefined;
          }
          break;
        case MessageType.DESTROY:
          {
            storeDeleteKey(ep, store_key!);
            returnValue = undefined;
          }
          break;
        default:
          return;
      }
      returnValue = await returnValue;
    } catch (value) {
      returnValue = { value, [throwMarker]: 0 };
    }
    const [wireValue, transferables] = toWireValue(
      ep,
      returnValue
    );
    if (ev.data.syncify) {
      syncResponse(ep, ev.data, wireValue);
    } else {
      ep.postMessage({ ...wireValue, id }, transferables);
    }
    if (type === MessageType.RELEASE) {
      // detach and deactive after sending release response above.
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
  return createProxy<T>(ep, undefined, [], target) as any;
}

function throwIfProxyReleased(isReleased: boolean) {
  if (isReleased) {
    throw new Error("Proxy has been released and is not useable");
  }
}

export function createProxy<T>(
  ep: Endpoint,
  store_key?: StoreKey,
  path: (string | number | symbol)[] = [],
  target: object = function () {},
  keys = []
): Remote<T> {
  let isProxyReleased = false;
  const proxy = new Proxy(target, {
    get(_target, prop) {
      throwIfProxyReleased(isProxyReleased);
      switch(prop){
        case(Symbol.toStringTag):
          return "ComlinkProxy";
        case(releaseProxy):
          return () => {
            new ComlinkTask(
              ep,
              {
                type: MessageType.RELEASE,
                path: path.map((p) => p.toString()),
              },
              [],
              () => {
                closeEndPoint(ep);
                isProxyReleased = true;
              }
            );
          };
        case("__destroy__"):
          if (!store_key) {
            return () => {};
          }
          return () => {
            return new ComlinkTask(
              ep,
              {
                type: MessageType.DESTROY,
                store_key,
              },
              [],
              () => {
                isProxyReleased = true;
              }
            );
          };
        case("then"):
        case("schedule_async"):
        case("schedule_sync"):
        case("syncify"):
          if (path.length === 0 && prop === "then") {
            return { then: () => proxy };
          }
          let r = new ComlinkTask(ep, {
            type: MessageType.GET,
            store_key,
            path: path.map((p) => p.toString()),
          });
          return r[prop].bind(r);
        default:
          return createProxy(ep, store_key, [...path, prop]);
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
        transferables
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
        return createProxy(ep, store_key, path.slice(0, -1));
      }
      if (last === "apply") {
        // temporary hack...
        rawArgumentList = rawArgumentList[1];
        path = path.slice(0, -1);
      }
      const [argumentList, transferables] = processArguments(
        ep,
        rawArgumentList
      );
      return new ComlinkTask(
        ep,
        {
          type: MessageType.APPLY,
          store_key,
          path: path.map((p) => p.toString()),
          argumentList,
        },
        transferables
      );
    },
    construct(_target, rawArgumentList) {
      throwIfProxyReleased(isProxyReleased);
      const [argumentList, transferables] = processArguments(
        ep,
        rawArgumentList
      );
      return requestResponseMessage(
        ep,
        {
          type: MessageType.CONSTRUCT,
          store_key,
          path: path.map((p) => p.toString()),
          argumentList,
        },
        transferables
      ).then((v) => fromWireValue(ep, v));
    },
    ownKeys(_target) {
      return keys;
    },
  });
  return proxy as any;
}

function myFlat<T>(arr: (T | T[])[]): T[] {
  return Array.prototype.concat.apply([], arr);
}

function processArguments(
  ep: Endpoint,
  argumentList: any[]
): [WireValue[], Transferable[]] {
  const processed = argumentList.map((v) => toWireValue(ep, v));
  return [processed.map((v) => v[0]), myFlat(processed.map((v) => v[1]))];
}

export function windowEndpoint(
  w: PostMessageWithOrigin,
  context: EventSource = self,
  targetOrigin = "*"
): Endpoint {
  return {
    postMessage: (msg: any, transferables: Transferable[]) =>
      w.postMessage(msg, targetOrigin, transferables),
    addEventListener: context.addEventListener.bind(context),
    removeEventListener: context.removeEventListener.bind(context),
  };
}

export const proxyMarker = Symbol("Comlink.proxy");

/**
 * Interface of values that were marked to be proxied with `comlink.proxy()`.
 * Can also be implemented by classes.
 */
export interface ProxyMarked {
  [proxyMarker]: true;
}

export function proxy<T>(obj: T): T & ProxyMarked {
  return Object.assign(obj, { [proxyMarker]: true }) as any;
}

/**
 * Internal transfer handle to handle objects marked to proxy.
 */
export const proxyTransferHandler: TransferHandler<object, MessagePort> = {
  canHandle: (val): val is ProxyMarked =>
    isObject(val) && (val as ProxyMarked)[proxyMarker],
  serialize(obj) {
    const { port1, port2 } = new MessageChannel();
    expose(obj, port1);
    return [port2, [port2]];
  },
  deserialize(port) {
    port.start();
    return wrap(port);
  },
};
