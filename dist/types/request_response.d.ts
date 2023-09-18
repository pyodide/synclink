import { Endpoint, Message, WireValue } from "./protocol";
export { requestResponseMessageInner, requestResponseMessage };
declare function requestResponseMessageInner(
  ep: Endpoint,
): [string, Promise<WireValue>];
declare function requestResponseMessage(
  ep: Endpoint,
  msg: Message,
  transfers?: Transferable[],
): Promise<WireValue>;
export declare let UUID_LENGTH: number;
export declare function generateUUID(): string;
