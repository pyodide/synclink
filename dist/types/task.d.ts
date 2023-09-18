import { Endpoint, Message, WireValue } from "./protocol";
type ResolvedSynclinkTask<T> = SynclinkTask<T> & {
    _result: T;
};
/**
 * This is a "syncifiable" promise. It consists of a task to be dispatched on
 * another thread. It can be dispatched asynchronously (the easy way) or
 * synchronously (the harder way). Either way, this promise does not start out
 * as scheduled, you
 */
export declare class SynclinkTask<T> {
    endpoint: Endpoint;
    msg: Message;
    extra: () => void;
    transfers: Transferable[];
    mode?: "sync" | "async";
    _resolved: boolean;
    _result?: T;
    _exception?: any;
    _promise: Promise<any>;
    _resolve: (value: any) => void;
    _reject: (value: any) => void;
    taskId?: number;
    _sync_gen?: Generator<undefined, any, undefined>;
    size_buffer?: Int32Array;
    signal_buffer?: Int32Array;
    constructor(endpoint: Endpoint, msg: Message, transfers?: Transferable[], extra?: () => void);
    schedule_async(): this;
    then<S>(onfulfilled: (value: T) => S, onrejected: (reason: any) => S): Promise<S>;
    catch<S>(onrejected: (reason: any) => S): Promise<S>;
    finally(onfinally: () => void): Promise<T>;
    schedule_sync(): this;
    isResolved(): this is ResolvedSynclinkTask<T>;
    poll(): boolean;
    do_sync(): Generator<undefined, string, undefined>;
    do_async(): Promise<T>;
    get result(): T;
    syncify(): T;
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
export declare function syncResponse(endpoint: Endpoint, msg: any, returnValue: WireValue): Promise<void>;
/**
 * Another thread can set this to a nonzero value to request an interrupt.
 */
export declare let interrupt_buffer: Int32Array;
/**
 * Sets the interrupt handler. This is called when the computation is
 * interrupted. Should zero the interrupt buffer and throw an exception.
 * @param handler
 */
export declare function setInterruptHandler(handler: () => never): void;
declare class _Syncifier {
    nextTaskId: Int32Array;
    signal_buffer: Int32Array;
    tasks: Map<number, SynclinkTask<any>>;
    constructor();
    scheduleTask(task: SynclinkTask<any>): void;
    waitOnSignalBuffer(): void;
    tasksIdsToWakeup(): Generator<number, void, void>;
    pollTasks(task?: SynclinkTask<any>): boolean;
    syncifyTask(task: SynclinkTask<any>): void;
}
export declare let Syncifier: _Syncifier;
export {};
