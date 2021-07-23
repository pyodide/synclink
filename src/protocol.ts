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

export interface EventSource {
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: {}
  ): void;

  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: {}
  ): void;
}

export interface PostMessageWithOrigin {
  postMessage(
    message: any,
    targetOrigin: string,
    transfer?: Transferable[]
  ): void;
}

export interface Endpoint extends EventSource {
  postMessage(message: any, transfer?: Transferable[]): void;
  start?: () => void;
}

export const enum WireValueType {
  RAW = "RAW",
  PROXY = "PROXY",
  THROW = "THROW",
  HANDLER = "HANDLER",
  ID = "ID",
}

export interface RawWireValue {
  id?: string;
  type: WireValueType.RAW;
  value: {};
}

export interface HandlerWireValue {
  id?: string;
  type: WireValueType.HANDLER;
  name: string;
  value: unknown;
}

export interface IdWireValue {
  id?: string;
  type: WireValueType.ID;
  ownkeys: string[];
  endpoint_uuid: string;
  store_key: number;
}

export type WireValue = RawWireValue | HandlerWireValue | IdWireValue;

export type MessageID = string;

export type StoreKey = number;

export const enum MessageType {
  GET = "GET",
  SET = "SET",
  APPLY = "APPLY",
  CONSTRUCT = "CONSTRUCT",
  ENDPOINT = "ENDPOINT",
  RELEASE = "RELEASE",
  DESTROY = "DESTROY",
}

export interface GetMessage {
  id?: MessageID;
  store_key?: StoreKey;
  type: MessageType.GET;
  path: string[];
}

export interface SetMessage {
  id?: MessageID;
  type: MessageType.SET;
  store_key?: StoreKey;
  path: string[];
  value: WireValue;
}

export interface ApplyMessage {
  id?: MessageID;
  type: MessageType.APPLY;
  store_key?: StoreKey;
  path: string[];
  argumentList: WireValue[];
}

export interface ConstructMessage {
  id?: MessageID;
  type: MessageType.CONSTRUCT;
  store_key?: StoreKey;
  path: string[];
  argumentList: WireValue[];
}

export interface EndpointMessage {
  id?: MessageID;
  type: MessageType.ENDPOINT;
}

export interface ReleaseMessage {
  id?: MessageID;
  type: MessageType.RELEASE;
  path: string[];
}

export interface DestroyMessage {
  id?: MessageID;
  type: MessageType.DESTROY;
  store_key: StoreKey;
}

export type Message =
  | GetMessage
  | SetMessage
  | ApplyMessage
  | ConstructMessage
  | EndpointMessage
  | ReleaseMessage
  | DestroyMessage;
