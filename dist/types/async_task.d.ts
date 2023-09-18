import { Endpoint, EventSource, PostMessageWithOrigin, StoreKey } from "./protocol";
import { Remote } from "./types";
export declare function expose(obj_arg: any, ep?: Endpoint): void;
export declare function wrap<T>(ep: Endpoint, target?: any): Remote<T>;
export declare function createProxy<T>(ep: Endpoint, { store_key, path, target, }: {
    store_key?: StoreKey;
    path?: (string | number | symbol)[];
    target?: object;
}): Remote<T>;
export declare function windowEndpoint(w: PostMessageWithOrigin, context?: EventSource, targetOrigin?: string): Endpoint;
