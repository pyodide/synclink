import { Endpoint, Message, WireValue } from "./protocol";

import {
  requestResponseMessage,
  requestResponseMessageInner,
  UUID_LENGTH,
} from "./request_response";
import SharedArrayBuffer from "./shared_array_buffer";

import { fromWireValue } from "./transfer_handlers";

let decoder = new TextDecoder("utf-8");
let encoder = new TextEncoder();

const SZ_BUF_SIZE_IDX = 0;
const SZ_BUF_FITS_IDX = 1;

const SZ_BUF_DOESNT_FIT = 0;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * This is a "syncifiable" promise. It consists of a task to be dispatched on
 * another thread. It can be dispatched asynchronously (the easy way) or
 * synchronously (the harder way). Either way, this promise does not start out
 * as scheduled, you
 */
export class SynclinkTask {
  endpoint: Endpoint;
  msg: Message;
  extra: () => void;
  transfers: Transferable[];

  mode?: "sync" | "async";

  _resolved: boolean;
  _result?: any;
  _exception?: any;

  // Async only
  _promise: Promise<any>;
  _resolve!: (value: any) => void;
  _reject!: (value: any) => void;

  // sync only
  taskId?: number;
  _sync_gen?: Generator<void, any, void>;
  size_buffer?: Int32Array;
  signal_buffer?: Int32Array;

  constructor(
    endpoint: Endpoint,
    msg: Message,
    transfers: Transferable[] = [],
    extra: () => void = () => {},
  ) {
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
      // already scheduled
      return;
    }
    if (this.mode === "sync") {
      throw new Error("Already synchronously scheduled");
    }
    this.mode = "async";
    this.do_async().then(
      (value) => {
        // console.log("resolving", this.taskId, "value", value);
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

  async then(
    onfulfilled: (value: any) => any,
    onrejected: (reason: any) => any,
  ) {
    this.schedule_async();
    return this._promise.then(onfulfilled, onrejected);
  }

  catch(onrejected: (reason: any) => any) {
    this.schedule_async();
    return this._promise.catch(onrejected);
  }

  finally(onfinally: () => void) {
    this.schedule_async();
    return this._promise.finally(onfinally);
  }

  schedule_sync() {
    if (this.mode === "sync") {
      // already scheduled
      return;
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

  poll() {
    if (this.mode != "sync") {
      throw new Error("Task not synchronously scheduled");
    }
    let { done, value } = this._sync_gen!.next();
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
    // just use syncRequest.
    let { endpoint, msg, transfers } = this;
    let size_buffer = new Int32Array(new SharedArrayBuffer(8));
    let signal_buffer = this.signal_buffer!;
    let taskId = this.taskId;
    // Ensure status is cleared. We will notify
    let data_buffer = acquireDataBuffer(UUID_LENGTH);
    // console.log("===requesting", taskId);
    endpoint.postMessage(
      {
        ...msg,
        size_buffer,
        data_buffer,
        signal_buffer,
        taskId,
        syncify: true,
      },
      transfers,
    );
    yield;
    if (Atomics.load(size_buffer, SZ_BUF_FITS_IDX) === SZ_BUF_DOESNT_FIT) {
      // There wasn't enough space, make a bigger data_buffer.
      // First read uuid for response out of current data_buffer
      const id = decoder.decode(data_buffer.slice(0, UUID_LENGTH));
      releaseDataBuffer(data_buffer);
      const size = Atomics.load(size_buffer, SZ_BUF_SIZE_IDX);
      data_buffer = acquireDataBuffer(size);
      // console.log("===bigger data buffer", taskId);
      endpoint.postMessage({ id, data_buffer });
      yield;
    }
    const size = Atomics.load(size_buffer, SZ_BUF_SIZE_IDX);
    // console.log("===completing", taskId);
    return JSON.parse(decoder.decode(data_buffer.slice(0, size)));
  }

  async do_async() {
    let result = await requestResponseMessage(
      this.endpoint,
      this.msg,
      this.transfers,
    );
    this.extra();
    return fromWireValue(this.endpoint, result);
  }

  get result() {
    if (this._exception) {
      throw this._exception;
    }
    // console.log(this._resolved);
    if (this._resolved) {
      return this._result;
    }
    throw new Error("Not ready.");
  }

  syncify(): any {
    this.schedule_sync();
    Syncifier.syncifyTask(this);
    return this.result;
  }
}

async function signalRequester(signal_buffer: Uint32Array, taskId: number) {
  let index = (taskId >> 1) % 32;
  let sleepTime = 1;
  while (Atomics.compareExchange(signal_buffer, index + 1, 0, taskId) !== 0) {
    // No Atomics.asyncWait except on Chrome =(
    await sleep(sleepTime);
    if (sleepTime < 32) {
      // exponential backoff
      sleepTime *= 2;
    }
  }
  Atomics.or(signal_buffer, 0, 1 << index);
  // @ts-ignore
  Atomics.notify(signal_buffer, 0);
}

/**
 * Respond to a blocking request. Most of the work has already been done in
 * asynclink, we are just responsible here for getting the return value back to
 * the requester through this slightly convoluted Atomics protocol.
 *
 * @param endpoint A message port to receive messages from. Other thread is
 *        blocked, so we can't send messages back.
 * @param msg The message that was received. We will use it to read out the
 *        buffers to write the answer into. NOTE: requester owns buffers.
 * @param returnValue The value we want to send back to the requester. We have
 *        to encode it into data_buffer.
 */
export async function syncResponse(
  endpoint: Endpoint,
  msg: any,
  returnValue: WireValue,
) {
  try {
    let { size_buffer, data_buffer, signal_buffer, taskId } = msg;
    // console.warn(msg);
    let bytes = encoder.encode(JSON.stringify(returnValue));
    let fits = bytes.length <= data_buffer.length;
    Atomics.store(size_buffer, SZ_BUF_SIZE_IDX, bytes.length);
    Atomics.store(size_buffer, SZ_BUF_FITS_IDX, +fits);
    if (!fits) {
      // console.log("      need larger buffer", taskId)
      // Request larger buffer
      let [uuid, data_promise] = requestResponseMessageInner(endpoint);
      // Write UUID into data_buffer so syncRequest knows where to respond to.
      data_buffer.set(encoder.encode(uuid));
      await signalRequester(signal_buffer, taskId);
      // Wait for response with new bigger data_buffer
      data_buffer = ((await data_promise) as any).data_buffer;
    }
    // Encode result into data_buffer
    data_buffer.set(bytes);
    Atomics.store(size_buffer, SZ_BUF_FITS_IDX, +true);
    // @ts-ignore
    // console.log("       signaling completion", taskId)
    await signalRequester(signal_buffer, taskId);
  } catch (e) {
    console.warn(e);
  }
}

let dataBuffers: Uint8Array[][] = [];

function acquireDataBuffer(size: number): Uint8Array {
  let powerof2 = Math.ceil(Math.log2(size));
  if (!dataBuffers[powerof2]) {
    dataBuffers[powerof2] = [];
  }
  let result = dataBuffers[powerof2].pop();
  if (result) {
    result.fill(0);
    return result;
  }
  return new Uint8Array(new SharedArrayBuffer(2 ** powerof2));
}

function releaseDataBuffer(buffer: Uint8Array) {
  let powerof2 = Math.ceil(Math.log2(buffer.byteLength));
  dataBuffers[powerof2].push(buffer);
}

/**
 * Another thread can set this to a nonzero value to request an interrupt.
 */
export let interrupt_buffer = new Int32Array(new SharedArrayBuffer(4));

let handleInterrupt = () => {
  interrupt_buffer[0] = 0;
  throw new Error("Interrupted!");
};

/**
 * Sets the interrupt handler. This is called when the computation is
 * interrupted. Should zero the interrupt buffer and throw an exception.
 * @param handler
 */
export function setInterruptHandler(handler: () => never) {
  handleInterrupt = handler;
}

class _Syncifier {
  nextTaskId: Int32Array;
  signal_buffer: Int32Array;
  tasks: Map<number, SynclinkTask>;
  constructor() {
    this.nextTaskId = new Int32Array([1]);
    this.signal_buffer = new Int32Array(new SharedArrayBuffer(32 * 4 + 4));
    this.tasks = new Map();
  }

  scheduleTask(task: SynclinkTask) {
    task.taskId = this.nextTaskId[0];
    this.nextTaskId[0] += 2;
    task.signal_buffer = this.signal_buffer;
    this.tasks.set(task.taskId, task);
  }

  waitOnSignalBuffer() {
    let timeout = 50;
    while (true) {
      let status = Atomics.wait(this.signal_buffer, 0, 0, timeout);
      switch (status) {
        case "ok":
        case "not-equal":
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

  pollTasks(task?: SynclinkTask) {
    let result = false;
    for (let wokenTaskId of this.tasksIdsToWakeup()) {
      // console.log("poll task", wokenTaskId, "looking for",task);
      let wokenTask = this.tasks.get(wokenTaskId);
      if (!wokenTask) {
        throw new Error(`Assertion error: unknown taskId ${wokenTaskId}.`);
      }
      if (wokenTask!.poll()) {
        // console.log("completed task ", wokenTaskId, wokenTask, wokenTask._result);
        this.tasks.delete(wokenTaskId);
        if (wokenTask === task) {
          result = true;
        }
      }
    }
    return result;
  }

  syncifyTask(task: SynclinkTask) {
    while (true) {
      this.waitOnSignalBuffer();
      // console.log("syncifyTask:: woke");
      if (this.pollTasks(task)) {
        return;
      }
    }
  }
}
export let Syncifier = new _Syncifier();

(async function syncifyPollLoop() {
  while (true) {
    Syncifier.pollTasks();
    await sleep(20);
  }
})();
