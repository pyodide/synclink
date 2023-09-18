"use strict";
var Synclink = (() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __pow = Math.pow;
  var __defNormalProp = (obj, key, value) =>
    key in obj
      ? __defProp(obj, key, {
          enumerable: true,
          configurable: true,
          writable: true,
          value,
        })
      : (obj[key] = value);
  var __spreadValues = (a, b) => {
    for (var prop in (b ||= {}))
      if (__hasOwnProp.call(b, prop)) __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop)) __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __name = (target, value) =>
    __defProp(target, "name", { value, configurable: true });
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if ((from && typeof from === "object") || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, {
            get: () => from[key],
            enumerable:
              !(desc = __getOwnPropDesc(from, key)) || desc.enumerable,
          });
    }
    return to;
  };
  var __toCommonJS = (mod) =>
    __copyProps(__defProp({}, "__esModule", { value: true }), mod);
  var __async = (__this, __arguments, generator) => {
    return new Promise((resolve, reject) => {
      var fulfilled = (value) => {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      };
      var rejected = (value) => {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      };
      var step = (x) =>
        x.done
          ? resolve(x.value)
          : Promise.resolve(x.value).then(fulfilled, rejected);
      step((generator = generator.apply(__this, __arguments)).next());
    });
  };

  // src/synclink.ts
  var synclink_exports = {};
  __export(synclink_exports, {
    FakeMessageChannel: () => FakeMessageChannel1,
    Syncifier: () => Syncifier,
    createEndpoint: () => createEndpoint,
    expose: () => expose,
    interrupt_buffer: () => interrupt_buffer,
    proxy: () => proxy,
    proxyMarker: () => proxyMarker,
    releaseProxy: () => releaseProxy,
    setInterruptHandler: () => setInterruptHandler,
    transfer: () => transfer,
    transferHandlers: () => transferHandlers,
    windowEndpoint: () => windowEndpoint,
    wrap: () => wrap,
  });

  // src/protocol.ts
  var wireValueTypeRecord = {
    ["RAW" /* RAW */]: 1,
    ["PROXY" /* PROXY */]: 1,
    ["THROW" /* THROW */]: 1,
    ["HANDLER" /* HANDLER */]: 1,
    ["ID" /* ID */]: 1,
  };
  var wireValueTypeSet = new Set(Object.keys(wireValueTypeRecord));
  var messageTypeRecord = {
    ["SET" /* SET */]: 1,
    ["GET" /* GET */]: 1,
    ["APPLY" /* APPLY */]: 1,
    ["CONSTRUCT" /* CONSTRUCT */]: 1,
    ["ENDPOINT" /* ENDPOINT */]: 1,
    ["RELEASE" /* RELEASE */]: 1,
    ["DESTROY" /* DESTROY */]: 1,
  };
  var messageTypeSet = new Set(Object.keys(messageTypeRecord));

  // src/request_response.ts
  function requestResponseMessageInner(ep) {
    const id = generateUUID();
    return [
      id,
      new Promise((resolve) => {
        ep.addEventListener(
          "message",
          /* @__PURE__ */ __name(function l(ev) {
            if (!ev.data || !ev.data.id || ev.data.id !== id) {
              return;
            }
            ep.removeEventListener("message", l);
            resolve(ev.data);
          }, "l"),
        );
        if (ep.start) {
          ep.start();
        }
      }),
    ];
  }
  __name(requestResponseMessageInner, "requestResponseMessageInner");
  function requestResponseMessage(ep, msg, transfers) {
    let [id, promise] = requestResponseMessageInner(ep);
    ep.postMessage(__spreadValues({ id }, msg), transfers);
    return promise;
  }
  __name(requestResponseMessage, "requestResponseMessage");
  var UUID_LENGTH = 63;
  function randomSegment() {
    let result = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(
      16,
    );
    let pad = 15 - result.length;
    if (pad > 0) {
      result = Array.from({ length: pad }, (_) => 0).join("") + result;
    }
    return result;
  }
  __name(randomSegment, "randomSegment");
  function generateUUID() {
    let result = Array.from({ length: 4 }, randomSegment).join("-");
    if (result.length !== UUID_LENGTH) {
      throw new Error("synclink internal error: UUID has the wrong length");
    }
    return result;
  }
  __name(generateUUID, "generateUUID");

  // src/types.ts
  var createEndpoint = Symbol("Synclink.endpoint");
  var releaseProxy = Symbol("Synclink.releaseProxy");
  var proxyMarker = Symbol("Synclink.proxy");

  // src/shared_array_buffer.ts
  var temp;
  if (typeof SharedArrayBuffer === "undefined") {
    temp = ArrayBuffer;
  } else {
    temp = SharedArrayBuffer;
  }
  var shared_array_buffer_default = temp;

  // src/task.ts
  var decoder = new TextDecoder("utf-8");
  var encoder = new TextEncoder();
  var SZ_BUF_SIZE_IDX = 0;
  var SZ_BUF_FITS_IDX = 1;
  var SZ_BUF_DOESNT_FIT = 0;
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  __name(sleep, "sleep");
  var SynclinkTask = class {
    constructor(endpoint, msg, transfers = [], extra = () => {}) {
      this.endpoint = endpoint;
      this.msg = msg;
      this.extra = extra;
      this.transfers = transfers;
      this._resolved = false;
      this._promise = new Promise((resolve, reject) => {
        this._resolve = resolve;
        this._reject = reject;
      });
    }
    schedule_async() {
      if (this.mode === "async") {
        return this;
      }
      if (this.mode === "sync") {
        throw new Error("Already synchronously scheduled");
      }
      this.mode = "async";
      this.do_async().then(
        (value) => {
          this._resolved = true;
          this._result = value;
          this._resolve(value);
        },
        (reason) => {
          this._exception = reason;
          this._reject(reason);
        },
      );
      return this;
    }
    then(onfulfilled, onrejected) {
      return __async(this, null, function* () {
        this.schedule_async();
        return this._promise.then(onfulfilled, onrejected);
      });
    }
    catch(onrejected) {
      this.schedule_async();
      return this._promise.catch(onrejected);
    }
    finally(onfinally) {
      this.schedule_async();
      return this._promise.finally(onfinally);
    }
    schedule_sync() {
      if (this.mode === "sync") {
        return this;
      }
      if (this.mode === "async") {
        throw new Error("Already asynchronously scheduled");
      }
      this.mode = "sync";
      Syncifier.scheduleTask(this);
      this._sync_gen = this.do_sync();
      this._sync_gen.next();
      return this;
    }
    isResolved() {
      return this._resolved;
    }
    poll() {
      if (this.mode != "sync") {
        throw new Error("Task not synchronously scheduled");
      }
      let { done, value } = this._sync_gen.next();
      if (!done) {
        return false;
      }
      try {
        this._resolved = true;
        this._result = fromWireValue(this.endpoint, value);
      } catch (e) {
        console.warn("synclink exception:", e);
        this._exception = e;
      }
      return true;
    }
    *do_sync() {
      let { endpoint, msg, transfers } = this;
      let size_buffer = new Int32Array(new shared_array_buffer_default(8));
      let signal_buffer = this.signal_buffer;
      let taskId = this.taskId;
      let data_buffer = acquireDataBuffer(UUID_LENGTH);
      endpoint.postMessage(
        __spreadProps(__spreadValues({}, msg), {
          size_buffer,
          data_buffer,
          signal_buffer,
          taskId,
          syncify: true,
        }),
        transfers,
      );
      yield;
      if (Atomics.load(size_buffer, SZ_BUF_FITS_IDX) === SZ_BUF_DOESNT_FIT) {
        const id = decoder.decode(data_buffer.slice(0, UUID_LENGTH));
        releaseDataBuffer(data_buffer);
        const size2 = Atomics.load(size_buffer, SZ_BUF_SIZE_IDX);
        data_buffer = acquireDataBuffer(size2);
        endpoint.postMessage({ id, data_buffer });
        yield;
      }
      const size = Atomics.load(size_buffer, SZ_BUF_SIZE_IDX);
      return JSON.parse(decoder.decode(data_buffer.slice(0, size)));
    }
    do_async() {
      return __async(this, null, function* () {
        let result = yield requestResponseMessage(
          this.endpoint,
          this.msg,
          this.transfers,
        );
        this.extra();
        return fromWireValue(this.endpoint, result);
      });
    }
    get result() {
      if (this._exception) {
        throw this._exception;
      }
      if (this.isResolved()) {
        return this._result;
      }
      throw new Error("Not ready.");
    }
    syncify() {
      this.schedule_sync();
      Syncifier.syncifyTask(this);
      return this.result;
    }
  };
  __name(SynclinkTask, "SynclinkTask");
  function signalRequester(signal_buffer, taskId) {
    return __async(this, null, function* () {
      let index = (taskId >> 1) % 32;
      let sleepTime = 1;
      while (
        Atomics.compareExchange(signal_buffer, index + 1, 0, taskId) !== 0
      ) {
        yield sleep(sleepTime);
        if (sleepTime < 32) {
          sleepTime *= 2;
        }
      }
      Atomics.or(signal_buffer, 0, 1 << index);
      Atomics.notify(signal_buffer, 0);
    });
  }
  __name(signalRequester, "signalRequester");
  function syncResponse(endpoint, msg, returnValue) {
    return __async(this, null, function* () {
      try {
        let { size_buffer, data_buffer, signal_buffer, taskId } = msg;
        let bytes = encoder.encode(JSON.stringify(returnValue));
        let fits = bytes.length <= data_buffer.length;
        Atomics.store(size_buffer, SZ_BUF_SIZE_IDX, bytes.length);
        Atomics.store(size_buffer, SZ_BUF_FITS_IDX, +fits);
        if (!fits) {
          let [uuid, data_promise] = requestResponseMessageInner(endpoint);
          data_buffer.set(encoder.encode(uuid));
          yield signalRequester(signal_buffer, taskId);
          data_buffer = (yield data_promise).data_buffer;
        }
        data_buffer.set(bytes);
        Atomics.store(size_buffer, SZ_BUF_FITS_IDX, 1);
        yield signalRequester(signal_buffer, taskId);
      } catch (e) {
        console.warn(e);
      }
    });
  }
  __name(syncResponse, "syncResponse");
  var dataBuffers = [];
  function acquireDataBuffer(size) {
    let powerof2 = Math.ceil(Math.log2(size));
    if (!dataBuffers[powerof2]) {
      dataBuffers[powerof2] = [];
    }
    let result = dataBuffers[powerof2].pop();
    if (result) {
      result.fill(0);
      return result;
    }
    return new Uint8Array(new shared_array_buffer_default(__pow(2, powerof2)));
  }
  __name(acquireDataBuffer, "acquireDataBuffer");
  function releaseDataBuffer(buffer) {
    let powerof2 = Math.ceil(Math.log2(buffer.byteLength));
    dataBuffers[powerof2].push(buffer);
  }
  __name(releaseDataBuffer, "releaseDataBuffer");
  var interrupt_buffer = new Int32Array(new shared_array_buffer_default(4));
  var handleInterrupt = /* @__PURE__ */ __name(() => {
    interrupt_buffer[0] = 0;
    throw new Error("Interrupted!");
  }, "handleInterrupt");
  function setInterruptHandler(handler) {
    handleInterrupt = handler;
  }
  __name(setInterruptHandler, "setInterruptHandler");
  var _Syncifier = class {
    constructor() {
      this.nextTaskId = new Int32Array([1]);
      this.signal_buffer = new Int32Array(
        new shared_array_buffer_default(32 * 4 + 4),
      );
      this.tasks = /* @__PURE__ */ new Map();
    }
    scheduleTask(task) {
      task.taskId = this.nextTaskId[0];
      this.nextTaskId[0] += 2;
      task.signal_buffer = this.signal_buffer;
      this.tasks.set(task.taskId, task);
    }
    waitOnSignalBuffer() {
      console.log("waiting on signal buffer");
      const timeout = 50;
      while (true) {
        const status = Atomics.wait(this.signal_buffer, 0, 0, timeout);
        switch (status) {
          case "ok":
          case "not-equal":
            console.log("finished waiting on signal buffer");
            return;
          case "timed-out":
            if (interrupt_buffer[0] !== 0) {
              handleInterrupt();
            }
            break;
          default:
            throw new Error("Unreachable");
        }
      }
    }
    *tasksIdsToWakeup() {
      let flag = Atomics.load(this.signal_buffer, 0);
      for (let i = 0; i < 32; i++) {
        let bit = 1 << i;
        if (flag & bit) {
          Atomics.and(this.signal_buffer, 0, ~bit);
          let wokenTask = Atomics.exchange(this.signal_buffer, i + 1, 0);
          yield wokenTask;
        }
      }
    }
    pollTasks(task) {
      let result = false;
      if (!task && this.tasks.size < 1) {
        return true;
      }
      for (let wokenTaskId of this.tasksIdsToWakeup()) {
        console.log("poll task", wokenTaskId, "looking for", task);
        let wokenTask = this.tasks.get(wokenTaskId);
        if (!wokenTask) {
          throw new Error(`Assertion error: unknown taskId ${wokenTaskId}.`);
        }
        if (wokenTask.poll()) {
          console.log(
            "completed task ",
            wokenTaskId,
            wokenTask,
            wokenTask._result,
          );
          this.tasks.delete(wokenTaskId);
          if (wokenTask === task) {
            result = true;
          }
        }
      }
      return result;
    }
    syncifyTask(task) {
      while (true) {
        if (this.pollTasks(task)) {
          return;
        }
        if (task.endpoint._bypass) {
          throw new Error("oops!");
        }
        this.waitOnSignalBuffer();
      }
    }
  };
  __name(_Syncifier, "_Syncifier");
  var Syncifier = new _Syncifier();
  /* @__PURE__ */ __name(function syncifyPollLoop() {
    return __async(this, null, function* () {
      while (true) {
        if (Syncifier.pollTasks()) {
          return;
        }
        yield sleep(20);
      }
    });
  }, "syncifyPollLoop")();

  // src/async_task.ts
  function innerMessageHandler(obj_arg, ep, message) {
    const { id, path, store_key } = __spreadValues(
      {
        path: [],
        store_key: void 0,
      },
      message,
    );
    let obj;
    if (store_key) {
      obj = storeGetValue(ep, store_key);
    } else {
      obj = obj_arg;
    }
    if (obj_arg === void 0 && store_key === void 0) {
      console.warn(obj_arg, message);
      throw new Error("Internal synclink error!");
    }
    const argumentList = (message.argumentList || []).map((v) => {
      if (v.type === "PROXY" /* PROXY */) {
        return innerMessageHandler(obj_arg, ep, v.message);
      } else {
        return fromWireValue(ep, v);
      }
    });
    const last = path.pop();
    let parent = path.reduce((obj2, prop) => obj2[prop], obj);
    const rawValue = last ? parent[last] : obj;
    if (!last) {
      parent = void 0;
    }
    if (rawValue === void 0) {
      switch (message.type) {
        case "GET" /* GET */:
        case "SET" /* SET */:
          break;
        default:
          console.warn("Undefined", obj, path, last);
          throw new Error(`undefined!! ${obj}, ${path}, ${last}`);
      }
    }
    switch (message.type) {
      case "GET" /* GET */:
        {
          return rawValue;
        }
        break;
      case "SET" /* SET */:
        {
          parent[last] = fromWireValue(ep, message.value);
          return true;
        }
        break;
      case "APPLY" /* APPLY */:
        {
          if (last) {
            return parent[last].apply(parent, argumentList);
          } else {
            return rawValue.apply(parent, argumentList);
          }
        }
        break;
      case "CONSTRUCT" /* CONSTRUCT */:
        {
          const value = new rawValue(...argumentList);
          return proxy(value);
        }
        break;
      case "ENDPOINT" /* ENDPOINT */:
        {
          const { port1, port2 } = new MessageChannel();
          expose(obj, port2);
          return transfer(port1, [port1]);
        }
        break;
      case "RELEASE" /* RELEASE */:
        {
          return void 0;
        }
        break;
      case "DESTROY" /* DESTROY */:
        {
          storeDeleteKey(ep, store_key);
          return void 0;
        }
        break;
      default:
        return void 0;
    }
  }
  __name(innerMessageHandler, "innerMessageHandler");
  function expose(obj_arg, ep = globalThis) {
    const wrap2 = false;
    exposeInner(obj_arg, ep, wrap2);
  }
  __name(expose, "expose");
  function exposeInner(obj_arg, ep = globalThis, wrap2) {
    storeCreate(ep);
    ep.addEventListener(
      "message",
      /* @__PURE__ */ __name(function callback(ev) {
        return __async(this, null, function* () {
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
            return;
          }
          const message = ev.data;
          const { id, type, store_key } = __spreadValues(
            { store_key: void 0 },
            message,
          );
          if (wrap2 && store_key === void 0) {
            return;
          }
          const sync = ev.data.syncify;
          let returnValue;
          try {
            returnValue = innerMessageHandler(obj_arg, ep, message);
            if (returnValue && returnValue.then) {
              if (sync && ep._bypass) {
                throw new Error(
                  "Cannot use syncify with bypass on an async method",
                );
              }
              returnValue = yield returnValue;
            }
          } catch (value) {
            returnValue = { value, [throwMarker]: 0 };
          }
          const [wireValue, transferables] = toWireValue(ep, returnValue);
          if (sync) {
            syncResponse(ep, ev.data, wireValue);
          } else {
            ep.postMessage(
              __spreadProps(__spreadValues({}, wireValue), { id }),
              transferables,
            );
          }
          if (type === "RELEASE" /* RELEASE */) {
            ep.removeEventListener("message", callback);
            closeEndPoint(ep);
          }
        });
      }, "callback"),
    );
    if (ep.start) {
      ep.start();
    }
  }
  __name(exposeInner, "exposeInner");
  function isMessagePort(endpoint) {
    return endpoint.constructor.name === "MessagePort";
  }
  __name(isMessagePort, "isMessagePort");
  function closeEndPoint(endpoint) {
    if (isMessagePort(endpoint)) endpoint.close();
  }
  __name(closeEndPoint, "closeEndPoint");
  function wrap(ep, target) {
    const wrap2 = true;
    exposeInner(void 0, ep, wrap2);
    return createProxy(ep, { target });
  }
  __name(wrap, "wrap");
  function throwIfProxyReleased(isReleased) {
    if (isReleased) {
      throw new Error("Proxy has been released and is not usable");
    }
  }
  __name(throwIfProxyReleased, "throwIfProxyReleased");
  function createProxy(
    ep,
    {
      store_key = void 0,
      path = [],
      target = /* @__PURE__ */ __name(function () {}, "target"),
    },
  ) {
    let isProxyReleased = false;
    const proxy2 = new Proxy(target, {
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
                  type: "RELEASE" /* RELEASE */,
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
                  type: "DESTROY" /* DESTROY */,
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
                type: "GET" /* GET */,
                store_key,
                path: path.map((p) => p.toString()),
              };
            };
          case "then":
          case "schedule_async":
          case "schedule_sync":
          case "syncify":
            if (path.length === 0 && prop === "then") {
              return { then: () => proxy2 };
            }
            let r = new SynclinkTask(
              ep,
              {
                type: "GET" /* GET */,
                store_key,
                path: path.map((p) => p.toString()),
              },
              [],
              void 0,
            );
            return r[prop].bind(r);
          default:
            return createProxy(ep, { store_key, path: [...path, prop] });
        }
      },
      set(_target, prop, rawValue) {
        throwIfProxyReleased(isProxyReleased);
        const [value, transferables] = toWireValue(ep, rawValue);
        return requestResponseMessage(
          ep,
          {
            type: "SET" /* SET */,
            store_key,
            path: [...path, prop].map((p) => p.toString()),
            value,
          },
          transferables,
        ).then((v) => fromWireValue(ep, v));
      },
      apply(_target, _thisArg, rawArgumentList) {
        throwIfProxyReleased(isProxyReleased);
        const last = path[path.length - 1];
        if (last === createEndpoint) {
          return requestResponseMessage(ep, {
            type: "ENDPOINT" /* ENDPOINT */,
          }).then((v) => fromWireValue(ep, v));
        }
        if (last === "bind") {
          return createProxy(ep, { store_key, path: path.slice(0, -1) });
        }
        if (last === "apply") {
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
            type: "APPLY" /* APPLY */,
            store_key,
            path: path.map((p) => p.toString()),
            argumentList,
          },
          transferables,
          void 0,
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
            type: "CONSTRUCT" /* CONSTRUCT */,
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
    return proxy2;
  }
  __name(createProxy, "createProxy");
  function myFlat(arr) {
    return Array.prototype.concat.apply([], arr);
  }
  __name(myFlat, "myFlat");
  function processArguments(ep, argumentList) {
    const processed = argumentList.map((v) => toWireValue(ep, v));
    return [processed.map((v) => v[0]), myFlat(processed.map((v) => v[1]))];
  }
  __name(processArguments, "processArguments");
  function windowEndpoint(w, context = self, targetOrigin = "*") {
    return {
      postMessage: (msg, transferables) =>
        w.postMessage(msg, targetOrigin, transferables),
      addEventListener: context.addEventListener.bind(context),
      removeEventListener: context.removeEventListener.bind(context),
    };
  }
  __name(windowEndpoint, "windowEndpoint");

  // src/fake_message_channel.ts
  var FakeMessagePort = class {
    constructor() {
      this._handlers = [];
      this._bypass = true;
      this._otherPort = this;
    }
    start() {}
    close() {}
    addEventListener(event, handler) {
      if (event === "message") {
        this._handlers.push(handler);
      }
    }
    removeEventListener(event, handler) {
      if (event !== "message") {
        return;
      }
      let idx = this._handlers.indexOf(handler);
      if (idx >= 0) {
        this._handlers.splice(idx, 1);
      }
    }
    postMessage(message, transfer2) {
      for (const h of this._otherPort._handlers) {
        h({ data: message });
      }
    }
  };
  __name(FakeMessagePort, "FakeMessagePort");
  var FakeMessageChannel = class {
    constructor() {
      this.port1 = new FakeMessagePort();
      this.port2 = new FakeMessagePort();
      this.port1._otherPort = this.port2;
      this.port2._otherPort = this.port1;
    }
  };
  __name(FakeMessageChannel, "FakeMessageChannel");
  var FakeMessageChannel1 = FakeMessageChannel;

  // src/transfer_handlers.ts
  var throwMarker = Symbol("Synclink.thrown");
  var transferCache = /* @__PURE__ */ new WeakMap();
  function transfer(obj, transfers) {
    transferCache.set(obj, transfers);
    return obj;
  }
  __name(transfer, "transfer");
  var isObject = /* @__PURE__ */ __name(
    (val) =>
      (typeof val === "object" && val !== null) || typeof val === "function",
    "isObject",
  );
  var transferHandlers = /* @__PURE__ */ new Map();
  function isArrayBufferOrView(obj) {
    return (
      ArrayBuffer.isView(obj) ||
      Object.prototype.toString.call(obj) === "[object ArrayBuffer]"
    );
  }
  __name(isArrayBufferOrView, "isArrayBufferOrView");
  function isPlain(val) {
    return (
      !val ||
      typeof val === "string" ||
      typeof val === "boolean" ||
      typeof val === "number" ||
      Array.isArray(val) ||
      isArrayBufferOrView(val) ||
      !val.constructor ||
      (val.constructor === Object &&
        Object.prototype.toString.call(val) === "[object Object]")
    );
  }
  __name(isPlain, "isPlain");
  function isSerializable(obj, transfers = []) {
    if (transfers.includes(obj)) {
      return true;
    }
    if (!isPlain(obj)) {
      return false;
    }
    for (var property in obj) {
      if (obj.hasOwnProperty(property)) {
        if (!isPlain(obj[property])) {
          return false;
        }
        if (typeof obj[property] == "object") {
          if (!isSerializable(obj[property], transfers)) {
            return false;
          }
        }
      }
    }
    return true;
  }
  __name(isSerializable, "isSerializable");
  var throwTransferHandler = {
    canHandle: (value) => isObject(value) && throwMarker in value,
    serialize({ value }) {
      let serialized;
      if (value instanceof Error) {
        serialized = {
          isError: true,
          value: {
            message: value.message,
            name: value.name,
            stack: value.stack,
          },
        };
      } else {
        serialized = { isError: false, value };
      }
      return [serialized, []];
    },
    deserialize(serialized) {
      if (serialized.isError) {
        throw Object.assign(
          new Error(serialized.value.message),
          serialized.value,
        );
      }
      throw serialized.value;
    },
  };
  function toWireValue(ep, value) {
    if (value && value.$$ep === ep) {
      return [
        {
          type: "PROXY" /* PROXY */,
          message: value._as_message(),
        },
        [],
      ];
    }
    if (
      value &&
      value.constructor &&
      value.constructor.name === "SynclinkTask"
    ) {
      return [
        {
          type: "PROXY" /* PROXY */,
          message: value.msg,
        },
        [],
      ];
    }
    if (ep._bypass) {
      proxyFakeMessagePort = true;
    }
    try {
      for (const [name, handler] of transferHandlers) {
        if (handler.canHandle(value)) {
          const [serializedValue, transferables] = handler.serialize(value);
          return [
            {
              type: "HANDLER" /* HANDLER */,
              name,
              value: serializedValue,
            },
            transferables,
          ];
        }
      }
    } finally {
      proxyFakeMessagePort = false;
    }
    if (isSerializable(value, transferCache.get(value))) {
      return [
        {
          type: "RAW" /* RAW */,
          value,
        },
        transferCache.get(value) || [],
      ];
    }
    let store_key = storeNewValue(ep, value);
    return [
      {
        type: "ID" /* ID */,
        store_key,
        endpoint_uuid: ep[endpointUUID],
        ownkeys: Object.getOwnPropertyNames(value),
      },
      [],
    ];
  }
  __name(toWireValue, "toWireValue");
  function fromWireValue(ep, value) {
    switch (value.type) {
      case "HANDLER" /* HANDLER */:
        return transferHandlers.get(value.name).deserialize(value.value);
      case "RAW" /* RAW */:
        return value.value;
      case "ID" /* ID */:
        let this_uuid = ep[endpointUUID];
        if (this_uuid === value.endpoint_uuid) {
          return storeGetValue(ep, value.store_key);
        } else {
          return createProxy(ep, { store_key: value.store_key });
        }
    }
  }
  __name(fromWireValue, "fromWireValue");
  var proxyStore = Symbol("Synclink.proxyStore");
  var endpointUUID = Symbol("Synclink.endpointUUID");
  function storeCreate(obj) {
    if (proxyStore in obj) {
      return;
    }
    obj[proxyStore] = {
      objects: /* @__PURE__ */ new Map(),
      counter: new Uint32Array([1]),
    };
    obj[endpointUUID] = generateUUID();
  }
  __name(storeCreate, "storeCreate");
  function storeGetValue(obj, key) {
    return obj[proxyStore].objects.get(key);
  }
  __name(storeGetValue, "storeGetValue");
  function storeNewValue(obj, value) {
    if (!(proxyStore in obj)) {
      storeCreate(obj);
    }
    let { objects, counter } = obj[proxyStore];
    while (objects.has(counter[0])) {
      counter[0] += 2;
    }
    let key = counter[0];
    counter[0] += 2;
    objects.set(key, value);
    return key;
  }
  __name(storeNewValue, "storeNewValue");
  function storeDeleteKey(obj, key) {
    let { objects } = obj[proxyStore];
    objects.delete(key);
    console.log("deleted", key, objects);
  }
  __name(storeDeleteKey, "storeDeleteKey");
  function proxy(obj) {
    return Object.assign(obj, { [proxyMarker]: true });
  }
  __name(proxy, "proxy");
  var proxyFakeMessagePort = false;
  var proxyTransferHandler = {
    canHandle: (val) => isObject(val) && val[proxyMarker],
    serialize(obj) {
      const { port1, port2 } = proxyFakeMessagePort
        ? new FakeMessageChannel1()
        : new MessageChannel();
      expose(obj, port1);
      return [port2, [port2]];
    },
    deserialize(port) {
      port.start();
      return wrap(port);
    },
  };

  // src/synclink.ts
  transferHandlers.set("throw", throwTransferHandler);
  transferHandlers.set("proxy", proxyTransferHandler);
  transferHandlers.set("headers", {
    canHandle(value) {
      return Object.prototype.toString.call(value) === "[object Headers]";
    },
    serialize(value) {
      return [Array.from(value), []];
    },
    deserialize(value) {
      return new Headers(value);
    },
  });
  return __toCommonJS(synclink_exports);
})();
//# sourceMappingURL=synclink.js.map
