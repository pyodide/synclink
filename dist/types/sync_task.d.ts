/**
 * Support blocking calls across a MessagePort.
 *
 * We use Atomics.wait to block the thread making the request.
 */
import { Endpoint, WireValue, Message } from "./protocol";
/**
 * An other thread can set this to a nonzero value to request an interrupt.
 */
export declare let interrupt_buffer: Int32Array;
/**
 * Sets the interrupt handler. This is called when the computation is
 * interrupted. Should zero the interrupt buffer and throw an exception.
 * @param handler
 */
export declare function setInterruptHandler(handler: () => never): void;
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
export declare function syncRequest(task: ProxyPromise): Generator<undefined, any, unknown>;
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
export declare function syncResponse(endpoint: Endpoint, msg: any, returnValue: WireValue): Promise<void>;
export {};
