import { WireValue, WireValueType } from "./protocol";

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

transferHandlers.set("throw", throwTransferHandler);

export function toWireValue(value: any): [WireValue, Transferable[]] {
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
  return [
    {
      type: WireValueType.RAW,
      value,
    },
    transferCache.get(value) || [],
  ];
}

export function fromWireValue(value: WireValue): any {
  switch (value.type) {
    case WireValueType.HANDLER:
      return transferHandlers.get(value.name)!.deserialize(value.value);
    case WireValueType.RAW:
      return value.value;
  }
}
