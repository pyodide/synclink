import { Endpoint, Message, WireValue } from "./protocol";
export { requestResponseMessageInner, requestResponseMessage };

function requestResponseMessageInner(
  ep: Endpoint
): [string, Promise<WireValue>] {
  const id = generateUUID();
  return [
    id,
    new Promise((resolve) => {
      ep.addEventListener("message", function l(ev: MessageEvent) {
        if (!ev.data || !ev.data.id || ev.data.id !== id) {
          // console.log("ignoring", ev.data, "looking for", id);
          return;
        }
        ep.removeEventListener("message", l as any);
        resolve(ev.data);
      } as any);
      if (ep.start) {
        ep.start();
      }
    }),
  ];
}

function requestResponseMessage(
  ep: Endpoint,
  msg: Message,
  transfers?: Transferable[]
): Promise<WireValue> {
  let [id, promise] = requestResponseMessageInner(ep);
  ep.postMessage({ id, ...msg }, transfers);
  return promise;
}

export let UUID_LENGTH = 63;

function randomSegment() {
  let result = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
  let pad = 15 - result.length;
  if (pad > 0) {
    result = Array.from({ length: pad }, (_) => 0).join("") + result;
  }
  return result;
}

export function generateUUID(): string {
  let result = Array.from({ length: 4 }, randomSegment).join("-");
  if (result.length !== UUID_LENGTH) {
    throw new Error("comlink internal error: UUID has the wrong length");
  }
  return result;
}
