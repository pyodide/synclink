import { assert, Has, NotHas, IsAny, IsExact } from "conditional-type-checks";

import * as Synclink from "../src/synclink.js";
import { SynclinkTask } from "../src/task.js";

async function closureSoICanUseAwait() {
  {
    function simpleNumberFunction() {
      return 4;
    }

    const proxy = Synclink.wrap<typeof simpleNumberFunction>(0 as any);
    assert<IsAny<typeof proxy>>(false);
    const v = proxy();
    assert<Has<typeof v, SynclinkTask<number>>>(true);
  }

  {
    function simpleObjectFunction() {
      return { a: 3 };
    }

    const proxy = Synclink.wrap<typeof simpleObjectFunction>(0 as any);
    const v = await proxy();
    assert<Has<typeof v, { a: number }>>(true);
  }

  {
    async function simpleAsyncFunction() {
      return { a: 3 };
    }

    const proxy = Synclink.wrap<typeof simpleAsyncFunction>(0 as any);
    const v = await proxy();
    assert<Has<typeof v, { a: number }>>(true);
  }

  {
    function functionWithProxy() {
      return Synclink.proxy({ a: 3 });
    }

    const proxy = Synclink.wrap<typeof functionWithProxy>(0 as any);
    const subproxy = await proxy();
    const prop = subproxy.a;
    assert<Has<typeof prop, SynclinkTask<number>>>(true);
  }

  {
    class X {
      static staticFunc() {
        return 4;
      }
      private f = 4;
      public g = 9;
      sayHi() {
        return "hi";
      }
    }

    const proxy = Synclink.wrap<typeof X>(0 as any);
    assert<Has<typeof proxy, { staticFunc: () => SynclinkTask<number> }>>(true);
    const instance = await new proxy();
    assert<Has<typeof instance, { sayHi: () => SynclinkTask<string> }>>(true);
    assert<Has<typeof instance, { g: SynclinkTask<number> }>>(true);
    assert<NotHas<typeof instance, { f: Promise<number> }>>(true);
    assert<IsAny<typeof instance>>(false);
  }

  {
    const x = {
      a: 4,
      b() {
        return 9;
      },
      c: {
        d: 3,
      },
    };

    const proxy = Synclink.wrap<typeof x>(0 as any);
    assert<IsAny<typeof proxy>>(false);
    const a = proxy.a;
    assert<Has<typeof a, SynclinkTask<number>>>(true);
    assert<IsAny<typeof a>>(false);
    const b = proxy.b;
    assert<Has<typeof b, () => SynclinkTask<number>>>(true);
    assert<IsAny<typeof b>>(false);
    const subproxy = proxy.c;
    assert<Has<typeof subproxy, SynclinkTask<{ d: number }>>>(true);
    assert<IsAny<typeof subproxy>>(false);
    const copy = await proxy.c;
    assert<Has<typeof copy, { d: number }>>(true);
  }

  {
    Synclink.wrap(new MessageChannel().port1);
    Synclink.expose({}, new MessageChannel().port2);

    interface Baz {
      baz: number;
      method(): number;
    }

    class Foo {
      constructor(cParam: string) {
        const self = this;
        assert<IsExact<typeof self.proxyProp, Bar & Synclink.ProxyMarked>>(
          true,
        );
      }
      prop1: string = "abc";
      proxyProp = Synclink.proxy(new Bar());
      methodWithTupleParams(...args: [string] | [number, string]): number {
        return 123;
      }
      methodWithProxiedReturnValue(): Baz & Synclink.ProxyMarked {
        return Synclink.proxy({ baz: 123, method: () => 123 });
      }
      methodWithProxyParameter(param: Baz & Synclink.ProxyMarked): void {}
    }

    class Bar {
      prop2: string | number = "abc";
      method(param: string): number {
        return 123;
      }
      methodWithProxiedReturnValue(): Baz & Synclink.ProxyMarked {
        return Synclink.proxy({ baz: 123, method: () => 123 });
      }
    }
    const proxy = Synclink.wrap<Foo>(Synclink.windowEndpoint(self));
    assert<IsExact<typeof proxy, Synclink.Remote<Foo>>>(true);

    proxy[Synclink.releaseProxy]();
    const endp = proxy[Synclink.createEndpoint]();
    assert<IsExact<typeof endp, Promise<MessagePort>>>(true);

    assert<IsAny<typeof proxy.prop1>>(false);
    assert<Has<typeof proxy.prop1, SynclinkTask<string>>>(true);

    const r1 = proxy.methodWithTupleParams(123, "abc");
    assert<IsExact<typeof r1, SynclinkTask<number>>>(true);

    const r2 = proxy.methodWithTupleParams("abc");
    assert<IsExact<typeof r2, SynclinkTask<number>>>(true);

    assert<
      IsExact<
        typeof proxy.proxyProp,
        Synclink.Remote<Bar & Synclink.ProxyMarked>
      >
    >(true);

    assert<IsAny<typeof proxy.proxyProp.prop2>>(false);
    assert<Has<typeof proxy.proxyProp.prop2, SynclinkTask<string>>>(true);
    assert<Has<typeof proxy.proxyProp.prop2, SynclinkTask<number>>>(true);

    const r3 = proxy.proxyProp.method("param");
    assert<IsAny<typeof r3>>(false);
    assert<Has<typeof r3, SynclinkTask<number>>>(true);

    // @ts-expect-error
    proxy.proxyProp.method(123);

    // @ts-expect-error
    proxy.proxyProp.method();

    const r4 = proxy.methodWithProxiedReturnValue();
    assert<IsAny<typeof r4>>(false);
    assert<
      IsExact<
        typeof r4,
        SynclinkTask<Synclink.Remote<Baz & Synclink.ProxyMarked>>
      >
    >(true);

    const r5 = proxy.proxyProp.methodWithProxiedReturnValue();
    assert<
      IsExact<
        typeof r5,
        SynclinkTask<Synclink.Remote<Baz & Synclink.ProxyMarked>>
      >
    >(true);

    const r6 = (await proxy.methodWithProxiedReturnValue()).baz;
    assert<IsAny<typeof r6>>(false);
    assert<Has<typeof r6, SynclinkTask<number>>>(true);

    const r7 = (await proxy.methodWithProxiedReturnValue()).method();
    assert<IsAny<typeof r7>>(false);
    assert<Has<typeof r7, SynclinkTask<number>>>(true);

    const ProxiedFooClass = Synclink.wrap<typeof Foo>(
      Synclink.windowEndpoint(self),
    );
    const inst1 = await new ProxiedFooClass("test");
    assert<IsExact<typeof inst1, Synclink.Remote<Foo>>>(true);
    inst1[Synclink.releaseProxy]();
    inst1[Synclink.createEndpoint]();

    // @ts-expect-error
    await new ProxiedFooClass(123);

    // @ts-expect-error
    await new ProxiedFooClass();

    //
    // Tests for advanced proxy use cases
    //

    // Type round trips
    // This tests that Local is the exact inverse of Remote for objects:
    assert<
      IsExact<
        Synclink.Local<Synclink.Remote<Synclink.ProxyMarked>>,
        Synclink.ProxyMarked
      >
    >(true);
    // This tests that Local is the exact inverse of Remote for functions, with one difference:
    // The local version of a remote function can be either implemented as a sync or async function,
    // because Remote<T> always makes the function async.
    assert<
      IsExact<
        Synclink.Local<Synclink.Remote<(a: number) => string>>,
        (a: number) => string | Promise<string>
      >
    >(true);

    interface Subscriber<T> {
      closed?: boolean;
      next?: (value: T) => void;
    }
    interface Unsubscribable {
      unsubscribe(): void;
    }
    /** A Subscribable that can get proxied by Synclink */
    interface ProxyableSubscribable<T> extends Synclink.ProxyMarked {
      subscribe(
        subscriber: Synclink.Remote<Subscriber<T> & Synclink.ProxyMarked>,
      ): Unsubscribable & Synclink.ProxyMarked;
    }

    /** Simple parameter object that gets cloned (not proxied) */
    interface Params {
      textDocument: string;
    }

    class Registry {
      async registerProvider(
        provider: Synclink.Remote<
          ((params: Params) => ProxyableSubscribable<string>) &
            Synclink.ProxyMarked
        >,
      ) {
        const resultPromise = provider({ textDocument: "foo" });
        assert<
          IsExact<
            typeof resultPromise,
            SynclinkTask<Synclink.Remote<ProxyableSubscribable<string>>>
          >
        >(true);
        const result = await resultPromise;

        const subscriptionPromise = result.subscribe({
          [Synclink.proxyMarker]: true,
          next: (value) => {
            assert<IsExact<typeof value, string>>(true);
          },
        });
        assert<
          IsExact<
            typeof subscriptionPromise,
            SynclinkTask<Synclink.Remote<Unsubscribable & Synclink.ProxyMarked>>
          >
        >(true);
        const subscriber = Synclink.proxy({
          next: (value: string) => console.log(value),
        });
        result.subscribe(subscriber);

        const r1 = (await subscriptionPromise).unsubscribe();
        assert<IsExact<typeof r1, SynclinkTask<void>>>(true);
      }
    }
    const proxy2 = Synclink.wrap<Registry>(Synclink.windowEndpoint(self));

    proxy2.registerProvider(
      // Synchronous callback
      Synclink.proxy(({ textDocument }: Params) => {
        const subscribable = Synclink.proxy({
          subscribe(
            subscriber: Synclink.Remote<
              Subscriber<string> & Synclink.ProxyMarked
            >,
          ): Unsubscribable & Synclink.ProxyMarked {
            // Important to test here is that union types (such as Function | undefined) distribute properly
            // when wrapped in Promises/proxied

            assert<IsAny<typeof subscriber.closed>>(false);
            assert<
              IsExact<
                typeof subscriber.closed,
                | SynclinkTask<true>
                | SynclinkTask<false>
                | SynclinkTask<undefined>
                | undefined
              >
            >(true);

            assert<IsAny<typeof subscriber.next>>(false);
            assert<
              IsExact<
                typeof subscriber.next,
                | Synclink.Remote<(value: string) => void>
                | SynclinkTask<undefined>
                | undefined
              >
            >(true);

            // @ts-expect-error
            subscriber.next();

            if (subscriber.next) {
              // Only checking for presence is not enough, since it could be a Promise
              // @ts-expect-error
              subscriber.next();
            }

            if (typeof subscriber.next === "function") {
              subscriber.next("abc");
            }

            return Synclink.proxy({ unsubscribe() {} });
          },
        });
        assert<Has<typeof subscribable, Synclink.ProxyMarked>>(true);
        return subscribable;
      }),
    );
    proxy2.registerProvider(
      // Async callback
      Synclink.proxy(async ({ textDocument }: Params) => {
        const subscribable = Synclink.proxy({
          subscribe(
            subscriber: Synclink.Remote<
              Subscriber<string> & Synclink.ProxyMarked
            >,
          ): Unsubscribable & Synclink.ProxyMarked {
            assert<IsAny<typeof subscriber.next>>(false);
            assert<
              IsExact<
                typeof subscriber.next,
                | Synclink.Remote<(value: string) => void>
                | SynclinkTask<undefined>
                | undefined
              >
            >(true);

            // Only checking for presence is not enough, since it could be a Promise
            if (typeof subscriber.next === "function") {
              subscriber.next("abc");
            }
            return Synclink.proxy({ unsubscribe() {} });
          },
        });
        return subscribable;
      }),
    );
  }

  // Transfer handlers
  {
    const urlTransferHandler: Synclink.TransferHandler<URL, string> = {
      canHandle: (val): val is URL => {
        assert<IsExact<typeof val, unknown>>(true);
        return val instanceof URL;
      },
      serialize: (url) => {
        assert<IsExact<typeof url, URL>>(true);
        return [url.href, []];
      },
      deserialize: (str) => {
        assert<IsExact<typeof str, string>>(true);
        return new URL(str);
      },
    };
    Synclink.transferHandlers.set("URL", urlTransferHandler);
  }
}
