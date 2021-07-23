/**
 * Support blocking calls accross a MessagePort.
 *
 * We use Atomics.wait to block the thread making the request.
 */

import { Endpoint, WireValue, Message } from "./protocol";

import { UUID_LENGTH } from "./request_response";

import { requestResponseMessageInner } from "./request_response";

let decoder = new TextDecoder("utf-8");
let encoder = new TextEncoder();

/**
 * Entry 0: A status flag:
 *    0  ==> Send a bigger data buffer to the id stored the current data_buffer.
 *    1  ==> task completed successfully and the result is in data_buffer
 *    -1 ==> task failed, the error can be found in data_buffer
 *
 * Entry 1: The size of the response.
 */
let size_buffer = new Int32Array(new SharedArrayBuffer(8));

/**
 * An other thread can set this to a nonzero value to request an interrupt.
 */
export let interrupt_buffer = new Int32Array(new SharedArrayBuffer(4));

/**
 * The response data is encoded as a JSON string into this buffer.
 * Initial data_buffer must be large enough to fit the UUID that the larger
 * buffer should be sent to. If more space is needed, we'll enlarge it.
 */
let data_buffer = new Uint8Array(new SharedArrayBuffer(UUID_LENGTH));

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

/**
 * Block until other thread signals us to wake up or signals an interrupt.
 *
 * If size_buffer[1] is nonzero, then Atomics.wait will immediately return
 * "not-equal" and this will do nothing.
 */
function waitOnSizeBuffer() {
  // console.log("waiting on size buffer");
  let index = 1;
  let value = 0;
  let timeout = 50;
  while (true) {
    switch (Atomics.wait(size_buffer, index, value, timeout)) {
      case "ok":
      case "not-equal":
        // console.log("finished waiting on size buffer");
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

interface ProxyPromise {
  endpoint: Endpoint;
  msg: Message;
  transfers: Transferable[];
}

/**
 * Synchronously request work to be done on the other thread. Will block by
 * using Atomics.wait on size_buffer until the other thread responds by using
 * Atomics.notify on size_buffer.
 *
 * See syncResponse for the response code, these two functions are bet read at
 * the same time. The responder may request data_buffer to be enlarged, in which
 * case we are expected to make a new data_buffer at least as large
 *
 * @param task {ProxyPromise} A task that can be scheduled on the other thread
 * @param task.endpoint {Endpoint} The endpoint we will use to send the request.
 *        Because we block, we can't hear any responses.
 * @param task.msg {Message} The message to send to request the task.
 * @param transfers {Transferable[]} A list of objects to transfer as part of
 * msg.
 */
export function* syncRequest(task: ProxyPromise) {
  let { endpoint, msg, transfers } = task;
  // Ensure status is cleared. We will notify
  Atomics.store(size_buffer, 1, 0);
  endpoint.postMessage(
    { ...msg, size_buffer, data_buffer, syncify: true },
    transfers
  );
  yield;
  waitOnSizeBuffer();
  if (Atomics.load(size_buffer, 1) === -1) {
    // There wasn't enough space, make a bigger data_buffer.
    // First read uuid for response out of current data_buffer
    const id = decoder.decode(data_buffer.slice(0, UUID_LENGTH));
    data_buffer = new Uint8Array(new SharedArrayBuffer(size_buffer[0]));
    endpoint.postMessage({ id, data_buffer });
    Atomics.store(size_buffer, 1, 0);
    waitOnSizeBuffer();
  }
  const size = size_buffer[0];
  return JSON.parse(decoder.decode(data_buffer.slice(0, size)));
}

/**
 * Respond to a blocking request. Most of the work has already been done in
 * asynclink, we are just responsible here for getting the return value back to
 * the requester through this slightly convoluted Atomics protocol.
 *
 * @param endpoint A message port to receive messages from. Other thread is
 *        blocked, so we can't send messages back.
 * @param msg The message that was recieved. We will use it to read out the
 *        buffers to write the answer into. NOTE: requester owns buffers.
 * @param returnValue The value we want to send back to the requester. We have
 *        to encode it into data_buffer.
 */
export async function syncResponse(
  endpoint: Endpoint,
  msg: any,
  returnValue: WireValue
) {
  try {
    let { size_buffer, data_buffer } = msg;
    let bytes = encoder.encode(JSON.stringify(returnValue));
    let fits = bytes.length <= data_buffer.length;
    Atomics.store(size_buffer, 0, bytes.length);
    Atomics.store(size_buffer, 1, fits ? 1 : -1);
    if (!fits) {
      // Request larger buffer
      let [uuid, data_promise] = requestResponseMessageInner(endpoint);
      // Write UUID into data_buffer so syncRequest knows where to respond to.
      data_buffer.set(encoder.encode(uuid));
      // @ts-ignore
      Atomics.notify(size_buffer, 1);
      // Wait for response with new bigger data_buffer
      data_buffer = ((await data_promise) as any).data_buffer;
    }
    // Encode result into data_buffer
    data_buffer.set(bytes);
    Atomics.store(size_buffer, 1, 1);
    // @ts-ignore
    Atomics.notify(size_buffer, 1);
  } catch (e) {
    console.warn(e);
  }
}
