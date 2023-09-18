import type { SynclinkTask } from "./task";
export declare const createEndpoint: unique symbol;
export declare const releaseProxy: unique symbol;
export declare const proxyMarker: unique symbol;
/**
 * Interface of values that were marked to be proxied with `synclink.proxy()`.
 * Can also be implemented by classes.
 */
export interface ProxyMarked {
  [proxyMarker]: true;
}
/**
 * Takes a type that may be Promise and unwraps the Promise type.
 * If `P` is not a Promise, it returns `P`.
 *
 * This is the inverse of `Promisify<T>`.
 */
type Unpromisify<P> = P extends Promise<infer T> ? T : P;
/**
 * Takes the raw type of a remote property and returns the type that is visible to the local thread on the proxy.
 *
 * Note: This needs to be its own type alias, otherwise it will not distribute over unions.
 * See https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types
 */
type RemoteProperty<T> = T extends Function | ProxyMarked
  ? Remote<T>
  : SynclinkTask<T>;
/**
 * Takes the raw type of a property as a remote thread would see it through a proxy (e.g. when passed in as a function
 * argument) and returns the type that the local thread has to supply.
 *
 * This is the inverse of `RemoteProperty<T>`.
 *
 * Note: This needs to be its own type alias, otherwise it will not distribute over unions. See
 * https://www.typescriptlang.org/docs/handbook/advanced-types.html#distributive-conditional-types
 */
type LocalProperty<T> = T extends Function | ProxyMarked ? Local<T> : UnTask<T>;
/**
 * Proxies `T` if it is a `ProxyMarked`, clones it otherwise (as handled by structured cloning and transfer handlers).
 */
export type ProxyOrClone<T> = T extends ProxyMarked ? Remote<T> : T;
/**
 * Inverse of `ProxyOrClone<T>`.
 */
export type UnproxyOrClone<T> = T extends RemoteObject<ProxyMarked>
  ? Local<T>
  : T;
/**
 * Takes the raw type of a remote object in the other thread and returns the type as it is visible to the local thread
 * when proxied with `Synclink.proxy()`.
 *
 * This does not handle call signatures, which is handled by the more general `Remote<T>` type.
 *
 * @template T The raw type of a remote object as seen in the other thread.
 */
export type RemoteObject<T> = {
  [P in keyof T]: RemoteProperty<T[P]>;
};
/**
 * Takes the type of an object as a remote thread would see it through a proxy (e.g. when passed in as a function
 * argument) and returns the type that the local thread has to supply.
 *
 * This does not handle call signatures, which is handled by the more general `Local<T>` type.
 *
 * This is the inverse of `RemoteObject<T>`.
 *
 * @template T The type of a proxied object.
 */
export type LocalObject<T> = {
  [P in keyof T]: LocalProperty<T[P]>;
};
/**
 * Additional special synclink methods available on each proxy returned by `Synclink.wrap()`.
 */
export interface ProxyMethods {
  [createEndpoint]: () => Promise<MessagePort>;
  [releaseProxy]: () => SynclinkTask<void>;
}
type UnTask<T> = T extends SynclinkTask<infer S> ? S : T;
type MaybePromise<T> = Promise<T> | T;
/**
 * Takes the raw type of a remote object, function or class in the other thread and returns the type as it is visible to
 * the local thread from the proxy return value of `Synclink.wrap()` or `Synclink.proxy()`.
 */
export type Remote<T> = RemoteObject<T> &
  (T extends (...args: infer TArguments) => infer TReturn
    ? (
        ...args: {
          [I in keyof TArguments]: UnproxyOrClone<TArguments[I]>;
        }
      ) => SynclinkTask<ProxyOrClone<Unpromisify<TReturn>>>
    : unknown) &
  (T extends {
    new (...args: infer TArguments): infer TInstance;
  }
    ? {
        new (
          ...args: {
            [I in keyof TArguments]: UnproxyOrClone<TArguments[I]>;
          }
        ): SynclinkTask<Remote<TInstance>>;
      }
    : unknown) &
  ProxyMethods;
/**
 * Takes the raw type of a remote object, function or class as a remote thread would see it through a proxy (e.g. when
 * passed in as a function argument) and returns the type the local thread has to supply.
 *
 * This is the inverse of `Remote<T>`. It takes a `Remote<T>` and returns its original input `T`.
 */
export type Local<T> = Omit<LocalObject<T>, keyof ProxyMethods> &
  (T extends (...args: infer TArguments) => infer TReturn
    ? (
        ...args: {
          [I in keyof TArguments]: ProxyOrClone<TArguments[I]>;
        }
      ) => MaybePromise<UnproxyOrClone<UnTask<TReturn>>>
    : unknown) &
  (T extends {
    new (...args: infer TArguments): infer TInstance;
  }
    ? {
        new (
          ...args: {
            [I in keyof TArguments]: ProxyOrClone<TArguments[I]>;
          }
        ): MaybePromise<Local<UnTask<TInstance>>>;
      }
    : unknown);
export {};
