/**
 * Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export { Endpoint } from "./protocol";

export {
  TransferHandler,
  transferHandlers,
  transfer,
} from "./transfer_handlers";
export {
  proxyMarker,
  ProxyMarked,
  proxy,
  createEndpoint,
  releaseProxy,
  expose,
  wrap,
  windowEndpoint,
  ProxyOrClone,
  UnproxyOrClone,
  RemoteObject,
  LocalObject,
  ProxyMethods,
  Remote,
  Local,
} from "./asynclink";

export { interrupt_buffer, setInterruptHandler, Syncifier } from "./comlink_task";

import { proxyTransferHandler } from "./asynclink";

import { transferHandlers, throwTransferHandler } from "./transfer_handlers";

transferHandlers.set("throw", throwTransferHandler);
transferHandlers.set("proxy", proxyTransferHandler);

transferHandlers.set("headers", {
  canHandle(value: unknown): value is Headers {
    return Object.prototype.toString.call(value) === "[object Headers]";
  },
  serialize(value: Headers): [string[][], Transferable[]] {
    return [Array.from(value as any), []];
  },
  deserialize(value: string[][]): Headers {
    return new Headers(value);
  },
});
