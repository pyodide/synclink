import { Endpoint, WireValue, WireValueType, StoreKey } from "./protocol";
import { generateUUID } from "./request_response";
import { createProxy } from "./asynclink";

export const throwMarker = Symbol("Comlink.thrown");

const transferCache = new WeakMap<any, Transferable[]>();
export function transfer<T>(obj: T, transfers: Transferable[]): T {
  transferCache.set(obj, transfers);
  return obj;
}

export const isObject = (val: unknown): val is object =>
  (typeof val === "object" && val !== null) || typeof val === "function";

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
export const transferHandlers = new Map<
  string,
  TransferHandler<unknown, unknown>
>();

function isPlain(val: any) {
  return (
    typeof val === "undefined" ||
    typeof val === "string" ||
    typeof val === "boolean" ||
    typeof val === "number" ||
    Array.isArray(val) ||
    !val.constructor ||
    (val.constructor === Object &&
      Object.prototype.toString.call(val) === "[object Object]")
  );
}

function isSerializable(obj: any, transfers: Transferable[] = []) {
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

interface ThrownValue {
  [throwMarker]: unknown; // just needs to be present
  value: unknown;
}
type SerializedThrownValue =
  | { isError: true; value: Error }
  | { isError: false; value: unknown };

/**
 * Internal transfer handler to handle thrown exceptions.
 */
export const throwTransferHandler: TransferHandler<
  ThrownValue,
  SerializedThrownValue
> = {
  canHandle: (value): value is ThrownValue =>
    isObject(value) && throwMarker in value,
  serialize({ value }) {
    let serialized: SerializedThrownValue;
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
        serialized.value
      );
    }
    throw serialized.value;
  },
};

export function toWireValue(
  ep: Endpoint,
  value: any,
): [WireValue, Transferable[]] {
  for (const [name, handler] of transferHandlers) {
    if (handler.canHandle(value)) {
      const [serializedValue, transferables] = handler.serialize(value);
      return [
        {
          type: WireValueType.HANDLER,
          name,
          value: serializedValue,
        },
        transferables,
      ];
    }
  }
  if (isSerializable(value, transferCache.get(value))) {
    return [
      {
        type: WireValueType.RAW,
        value,
      },
      transferCache.get(value) || [],
    ];
  }
  let store_key = storeNewValue(ep, value);
  return [
    {
      type: WireValueType.ID,
      store_key,
      endpoint_uuid: (ep as any)[endpointUUID],
      ownkeys: Object.getOwnPropertyNames(value),
    },
    [],
  ];
}

export function fromWireValue(
  ep: Endpoint,
  value: WireValue,
): any {
  switch (value.type) {
    case WireValueType.HANDLER:
      return transferHandlers.get(value.name)!.deserialize(value.value);
    case WireValueType.RAW:
      return value.value;
    case WireValueType.ID:
      let this_uuid = (ep as any)[endpointUUID];
      if (this_uuid === value.endpoint_uuid) {
        return storeGetValue(ep, value.store_key);
      } else {
        return createProxy(ep, value.store_key, []);
      }
  }
}

const proxyStore = Symbol("Comlink.proxyStore");
const endpointUUID = Symbol("Comlink.endpointUUID");

export function storeCreate(obj: any) {
  if (proxyStore in obj) {
    return;
  }
  obj[proxyStore] = { objects: new Map(), counter: new Uint32Array([1]) };
  obj[endpointUUID] = generateUUID();
}

export function storeGetValue(obj: any, key: StoreKey) {
  return obj[proxyStore].objects.get(key);
}

export function storeNewValue(obj: any, value: any): StoreKey {
  if (!(proxyStore in obj)) {
    storeCreate(obj);
  }
  let { objects, counter } = obj[proxyStore];
  while (objects.has(counter[0])) {
    // Increment by two here (and below) because even integers are reserved
    // for singleton constants
    counter[0] += 2;
  }
  let key = counter[0];
  counter[0] += 2;
  objects.set(key, value);
  return key;
}

export function storeDeleteKey(obj: any, key: StoreKey): any {
  let { objects } = obj[proxyStore];
  objects.delete(key);
  console.log("deleted", key, objects);
}
