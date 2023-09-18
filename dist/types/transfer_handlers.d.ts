import { Endpoint, WireValue, StoreKey } from "./protocol";
import { ProxyMarked } from "./types";
export declare const throwMarker: unique symbol;
export declare function transfer<T>(obj: T, transfers: Transferable[]): T;
export declare const isObject: (val: unknown) => val is object;
/**
 * Customizes the serialization of certain values as determined by `canHandle()`.
 *
 * @template T The input type being handled by this transfer handler.
 * @template S The serialized type sent over the wire.
 */
export interface TransferHandler<T, S> {
  /**
   * Gets called for every value to determine whether this transfer handler
   * should serialize the value, which includes checking that it is of the right
   * type (but can perform checks beyond that as well).
   */
  canHandle(value: unknown): value is T;
  /**
   * Gets called with the value if `canHandle()` returned `true` to produce a
   * value that can be sent in a message, consisting of structured-cloneable
   * values and/or transferrable objects.
   */
  serialize(value: T): [S, Transferable[]];
  /**
   * Gets called to deserialize an incoming value that was serialized in the
   * other thread with this transfer handler (known through the name it was
   * registered under).
   */
  deserialize(value: S): T;
}
/**
 * Allows customizing the serialization of certain values.
 */
export declare const transferHandlers: Map<
  string,
  TransferHandler<unknown, unknown>
>;
interface ThrownValue {
  [throwMarker]: unknown;
  value: unknown;
}
type SerializedThrownValue =
  | {
      isError: true;
      value: Error;
    }
  | {
      isError: false;
      value: unknown;
    };
/**
 * Internal transfer handler to handle thrown exceptions.
 */
export declare const throwTransferHandler: TransferHandler<
  ThrownValue,
  SerializedThrownValue
>;
export declare function toWireValue(
  ep: Endpoint,
  value: any,
): [WireValue, Transferable[]];
export declare function fromWireValue(ep: Endpoint, value: WireValue): any;
export declare function storeCreate(obj: any): void;
export declare function storeGetValue(obj: any, key: StoreKey): any;
export declare function storeNewValue(obj: any, value: any): StoreKey;
export declare function storeDeleteKey(obj: any, key: StoreKey): any;
export declare function proxy<T>(obj: T): T & ProxyMarked;
/**
 * Internal transfer handle to handle objects marked to proxy.
 */
export declare const proxyTransferHandler: TransferHandler<object, MessagePort>;
export {};
