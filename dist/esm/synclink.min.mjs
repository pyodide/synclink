var ee = Object.defineProperty,
  Ee = Object.defineProperties;
var Se = Object.getOwnPropertyDescriptors;
var J = Object.getOwnPropertySymbols;
var be = Object.prototype.hasOwnProperty,
  _e = Object.prototype.propertyIsEnumerable;
var re = Math.pow,
  Q = (e, r, t) =>
    r in e
      ? ee(e, r, { enumerable: !0, configurable: !0, writable: !0, value: t })
      : (e[r] = t),
  T = (e, r) => {
    for (var t in (r ||= {})) be.call(r, t) && Q(e, t, r[t]);
    if (J) for (var t of J(r)) _e.call(r, t) && Q(e, t, r[t]);
    return e;
  },
  b = (e, r) => Ee(e, Se(r)),
  a = (e, r) => ee(e, "name", { value: r, configurable: !0 });
var g = (e, r, t) =>
  new Promise((s, n) => {
    var c = (o) => {
        try {
          l(t.next(o));
        } catch (i) {
          n(i);
        }
      },
      u = (o) => {
        try {
          l(t.throw(o));
        } catch (i) {
          n(i);
        }
      },
      l = (o) => (o.done ? s(o.value) : Promise.resolve(o.value).then(c, u));
    l((t = t.apply(e, r)).next());
  });
var Me = { ["RAW"]: 1, ["PROXY"]: 1, ["THROW"]: 1, ["HANDLER"]: 1, ["ID"]: 1 },
  te = new Set(Object.keys(Me));
var Pe = {
    ["SET"]: 1,
    ["GET"]: 1,
    ["APPLY"]: 1,
    ["CONSTRUCT"]: 1,
    ["ENDPOINT"]: 1,
    ["RELEASE"]: 1,
    ["DESTROY"]: 1,
  },
  ne = new Set(Object.keys(Pe));
function W(e) {
  let r = D();
  return [
    r,
    new Promise((t) => {
      e.addEventListener(
        "message",
        a(function s(n) {
          !n.data ||
            !n.data.id ||
            n.data.id !== r ||
            (e.removeEventListener("message", s), t(n.data));
        }, "l"),
      ),
        e.start && e.start();
    }),
  ];
}
a(W, "requestResponseMessageInner");
function w(e, r, t) {
  let [s, n] = W(e);
  return e.postMessage(T({ id: s }, r), t), n;
}
a(w, "requestResponseMessage");
var _ = 63;
function Ae() {
  let e = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16),
    r = 15 - e.length;
  return r > 0 && (e = Array.from({ length: r }, (t) => 0).join("") + e), e;
}
a(Ae, "randomSegment");
function D() {
  let e = Array.from({ length: 4 }, Ae).join("-");
  if (e.length !== _)
    throw new Error("synclink internal error: UUID has the wrong length");
  return e;
}
a(D, "generateUUID");
var v = Symbol("Synclink.endpoint"),
  U = Symbol("Synclink.releaseProxy"),
  M = Symbol("Synclink.proxy");
var H;
typeof SharedArrayBuffer == "undefined"
  ? (H = ArrayBuffer)
  : (H = SharedArrayBuffer);
var k = H;
var se = new TextDecoder("utf-8"),
  ae = new TextEncoder(),
  C = 0,
  N = 1,
  Re = 0;
function le(e) {
  return new Promise((r) => setTimeout(r, e));
}
a(le, "sleep");
var h = class {
  constructor(r, t, s = [], n = () => {}) {
    (this.endpoint = r),
      (this.msg = t),
      (this.extra = n),
      (this.transfers = s),
      (this._resolved = !1),
      (this._promise = new Promise((c, u) => {
        (this._resolve = c), (this._reject = u);
      }));
  }
  schedule_async() {
    if (this.mode === "async") return this;
    if (this.mode === "sync")
      throw new Error("Already synchronously scheduled");
    return (
      (this.mode = "async"),
      this.do_async().then(
        (r) => {
          (this._resolved = !0), (this._result = r), this._resolve(r);
        },
        (r) => {
          (this._exception = r), this._reject(r);
        },
      ),
      this
    );
  }
  then(r, t) {
    return g(this, null, function* () {
      return this.schedule_async(), this._promise.then(r, t);
    });
  }
  catch(r) {
    return this.schedule_async(), this._promise.catch(r);
  }
  finally(r) {
    return this.schedule_async(), this._promise.finally(r);
  }
  schedule_sync() {
    if (this.mode === "sync") return this;
    if (this.mode === "async")
      throw new Error("Already asynchronously scheduled");
    return (
      (this.mode = "sync"),
      R.scheduleTask(this),
      (this._sync_gen = this.do_sync()),
      this._sync_gen.next(),
      this
    );
  }
  isResolved() {
    return this._resolved;
  }
  poll() {
    if (this.mode != "sync")
      throw new Error("Task not synchronously scheduled");
    let { done: r, value: t } = this._sync_gen.next();
    if (!r) return !1;
    try {
      (this._resolved = !0), (this._result = p(this.endpoint, t));
    } catch (s) {
      console.warn("synclink exception:", s), (this._exception = s);
    }
    return !0;
  }
  *do_sync() {
    let { endpoint: r, msg: t, transfers: s } = this,
      n = new Int32Array(new k(8)),
      c = this.signal_buffer,
      u = this.taskId,
      l = ie(_);
    if (
      (r.postMessage(
        b(T({}, t), {
          size_buffer: n,
          data_buffer: l,
          signal_buffer: c,
          taskId: u,
          syncify: !0,
        }),
        s,
      ),
      yield,
      Atomics.load(n, N) === Re)
    ) {
      let i = se.decode(l.slice(0, _));
      Ie(l);
      let y = Atomics.load(n, C);
      (l = ie(y)), r.postMessage({ id: i, data_buffer: l }), yield;
    }
    let o = Atomics.load(n, C);
    return JSON.parse(se.decode(l.slice(0, o)));
  }
  do_async() {
    return g(this, null, function* () {
      let r = yield w(this.endpoint, this.msg, this.transfers);
      return this.extra(), p(this.endpoint, r);
    });
  }
  get result() {
    if (this._exception) throw this._exception;
    if (this.isResolved()) return this._result;
    throw new Error("Not ready.");
  }
  syncify() {
    return this.schedule_sync(), R.syncifyTask(this), this.result;
  }
};
a(h, "SynclinkTask");
function oe(e, r) {
  return g(this, null, function* () {
    let t = (r >> 1) % 32,
      s = 1;
    for (; Atomics.compareExchange(e, t + 1, 0, r) !== 0; )
      yield le(s), s < 32 && (s *= 2);
    Atomics.or(e, 0, 1 << t), Atomics.notify(e, 0);
  });
}
a(oe, "signalRequester");
function ue(e, r, t) {
  return g(this, null, function* () {
    try {
      let { size_buffer: s, data_buffer: n, signal_buffer: c, taskId: u } = r,
        l = ae.encode(JSON.stringify(t)),
        o = l.length <= n.length;
      if ((Atomics.store(s, C, l.length), Atomics.store(s, N, +o), !o)) {
        let [i, y] = W(e);
        n.set(ae.encode(i)), yield oe(c, u), (n = (yield y).data_buffer);
      }
      n.set(l), Atomics.store(s, N, 1), yield oe(c, u);
    } catch (s) {
      console.warn(s);
    }
  });
}
a(ue, "syncResponse");
var P = [];
function ie(e) {
  let r = Math.ceil(Math.log2(e));
  P[r] || (P[r] = []);
  let t = P[r].pop();
  return t ? (t.fill(0), t) : new Uint8Array(new k(re(2, r)));
}
a(ie, "acquireDataBuffer");
function Ie(e) {
  let r = Math.ceil(Math.log2(e.byteLength));
  P[r].push(e);
}
a(Ie, "releaseDataBuffer");
var j = new Int32Array(new k(4)),
  ye = a(() => {
    throw ((j[0] = 0), new Error("Interrupted!"));
  }, "handleInterrupt");
function Oe(e) {
  ye = e;
}
a(Oe, "setInterruptHandler");
var A = class {
  constructor() {
    (this.nextTaskId = new Int32Array([1])),
      (this.signal_buffer = new Int32Array(new k(32 * 4 + 4))),
      (this.tasks = new Map());
  }
  scheduleTask(r) {
    (r.taskId = this.nextTaskId[0]),
      (this.nextTaskId[0] += 2),
      (r.signal_buffer = this.signal_buffer),
      this.tasks.set(r.taskId, r);
  }
  waitOnSignalBuffer() {
    console.log("waiting on signal buffer");
    let r = 50;
    for (;;)
      switch (Atomics.wait(this.signal_buffer, 0, 0, r)) {
        case "ok":
        case "not-equal":
          console.log("finished waiting on signal buffer");
          return;
        case "timed-out":
          j[0] !== 0 && ye();
          break;
        default:
          throw new Error("Unreachable");
      }
  }
  *tasksIdsToWakeup() {
    let r = Atomics.load(this.signal_buffer, 0);
    for (let t = 0; t < 32; t++) {
      let s = 1 << t;
      r & s &&
        (Atomics.and(this.signal_buffer, 0, ~s),
        yield Atomics.exchange(this.signal_buffer, t + 1, 0));
    }
  }
  pollTasks(r) {
    let t = !1;
    if (!r && this.tasks.size < 1) return !0;
    for (let s of this.tasksIdsToWakeup()) {
      console.log("poll task", s, "looking for", r);
      let n = this.tasks.get(s);
      if (!n) throw new Error(`Assertion error: unknown taskId ${s}.`);
      n.poll() &&
        (console.log("completed task ", s, n, n._result),
        this.tasks.delete(s),
        n === r && (t = !0));
    }
    return t;
  }
  syncifyTask(r) {
    for (;;) {
      if (this.pollTasks(r)) return;
      if (r.endpoint._bypass) throw new Error("oops!");
      this.waitOnSignalBuffer();
    }
  }
};
a(A, "_Syncifier");
var R = new A();
a(function () {
  return g(this, null, function* () {
    for (;;) {
      if (R.pollTasks()) return;
      yield le(20);
    }
  });
}, "syncifyPollLoop")();
function fe(e, r, t) {
  let { id: s, path: n, store_key: c } = T({ path: [], store_key: void 0 }, t),
    u;
  if ((c ? (u = K(r, c)) : (u = e), e === void 0 && c === void 0))
    throw (console.warn(e, t), new Error("Internal synclink error!"));
  let l = (t.argumentList || []).map((f) =>
      f.type === "PROXY" ? fe(e, r, f.message) : p(r, f),
    ),
    o = n.pop(),
    i = n.reduce((f, d) => f[d], u),
    y = o ? i[o] : u;
  if ((o || (i = void 0), y === void 0))
    switch (t.type) {
      case "GET":
      case "SET":
        break;
      default:
        throw (
          (console.warn("Undefined", u, n, o),
          new Error(`undefined!! ${u}, ${n}, ${o}`))
        );
    }
  switch (t.type) {
    case "GET":
      return y;
    case "SET":
      return (i[o] = p(r, t.value)), !0;
    case "APPLY":
      return o ? i[o].apply(i, l) : y.apply(i, l);
    case "CONSTRUCT":
      {
        let f = new y(...l);
        return F(f);
      }
      break;
    case "ENDPOINT":
      {
        let { port1: f, port2: d } = new MessageChannel();
        return O(u, d), G(f, [f]);
      }
      break;
    case "RELEASE":
      return;
    case "DESTROY":
      {
        Te(r, c);
        return;
      }
      break;
    default:
      return;
  }
}
a(fe, "innerMessageHandler");
function O(e, r = globalThis) {
  de(e, r, !1);
}
a(O, "expose");
function de(e, r = globalThis, t) {
  B(r),
    r.addEventListener(
      "message",
      a(function s(n) {
        return g(this, null, function* () {
          if (!n || !n.data) return;
          if (!ne.has(n.data.type)) {
            if (!te.has(n.data.type) && !n.data.data_buffer)
              throw (
                (console.warn("Internal error on message:", n.data),
                new Error(
                  `Synclink Internal error: Expected message.type to either be a MessageType or a WireValueType, got '${n.data.type}'`,
                ))
              );
            return;
          }
          let c = n.data,
            { id: u, type: l, store_key: o } = T({ store_key: void 0 }, c);
          if (t && o === void 0) return;
          let i = n.data.syncify,
            y;
          try {
            if (((y = fe(e, r, c)), y && y.then)) {
              if (i && r._bypass)
                throw new Error(
                  "Cannot use syncify with bypass on an async method",
                );
              y = yield y;
            }
          } catch (ke) {
            y = { value: ke, [Y]: 0 };
          }
          let [f, d] = V(r, y);
          i ? ue(r, n.data, f) : r.postMessage(b(T({}, f), { id: u }), d),
            l === "RELEASE" && (r.removeEventListener("message", s), pe(r));
        });
      }, "callback"),
    ),
    r.start && r.start();
}
a(de, "exposeInner");
function Ve(e) {
  return e.constructor.name === "MessagePort";
}
a(Ve, "isMessagePort");
function pe(e) {
  Ve(e) && e.close();
}
a(pe, "closeEndPoint");
function z(e, r) {
  return de(void 0, e, !0), E(e, { target: r });
}
a(z, "wrap");
function I(e) {
  if (e) throw new Error("Proxy has been released and is not usable");
}
a(I, "throwIfProxyReleased");
function E(
  e,
  {
    store_key: r = void 0,
    path: t = [],
    target: s = a(function () {}, "target"),
  },
) {
  let n = !1,
    c = new Proxy(s, {
      get(u, l) {
        switch ((I(n), l)) {
          case "$$ep":
            return e;
          case Symbol.toStringTag:
            return "SynclinkProxy";
          case U:
            return () =>
              new h(
                e,
                { type: "RELEASE", path: t.map((i) => i.toString()) },
                [],
                () => {
                  pe(e), (n = !0);
                },
              );
          case "__destroy__":
            return r
              ? () =>
                  new h(e, { type: "DESTROY", store_key: r }, [], () => {
                    n = !0;
                  })
              : () => {};
          case "_as_message":
            return () => ({
              type: "GET",
              store_key: r,
              path: t.map((i) => i.toString()),
            });
          case "then":
          case "schedule_async":
          case "schedule_sync":
          case "syncify":
            if (t.length === 0 && l === "then") return { then: () => c };
            let o = new h(
              e,
              { type: "GET", store_key: r, path: t.map((i) => i.toString()) },
              [],
              void 0,
            );
            return o[l].bind(o);
          default:
            return E(e, { store_key: r, path: [...t, l] });
        }
      },
      set(u, l, o) {
        I(n);
        let [i, y] = V(e, o);
        return w(
          e,
          {
            type: "SET",
            store_key: r,
            path: [...t, l].map((f) => f.toString()),
            value: i,
          },
          y,
        ).then((f) => p(e, f));
      },
      apply(u, l, o) {
        I(n);
        let i = t[t.length - 1];
        if (i === v) return w(e, { type: "ENDPOINT" }).then((d) => p(e, d));
        if (i === "bind") return E(e, { store_key: r, path: t.slice(0, -1) });
        i === "apply" && ((o = o[1]), (t = t.slice(0, -1)));
        let [y, f] = ce(e, o);
        return new h(
          e,
          {
            type: "APPLY",
            store_key: r,
            path: t.map((d) => d.toString()),
            argumentList: y,
          },
          f,
          void 0,
        );
      },
      construct(u, l) {
        I(n);
        let [o, i] = ce(e, l);
        return w(
          e,
          {
            type: "CONSTRUCT",
            store_key: r,
            path: t.map((y) => y.toString()),
            argumentList: o,
          },
          i,
        ).then((y) => p(e, y));
      },
      ownKeys(u) {
        return [];
      },
    });
  return c;
}
a(E, "createProxy");
function Le(e) {
  return Array.prototype.concat.apply([], e);
}
a(Le, "myFlat");
function ce(e, r) {
  let t = r.map((s) => V(e, s));
  return [t.map((s) => s[0]), Le(t.map((s) => s[1]))];
}
a(ce, "processArguments");
function We(e, r = self, t = "*") {
  return {
    postMessage: (s, n) => e.postMessage(s, t, n),
    addEventListener: r.addEventListener.bind(r),
    removeEventListener: r.removeEventListener.bind(r),
  };
}
a(We, "windowEndpoint");
var S = class {
  constructor() {
    this._handlers = [];
    this._bypass = !0;
    this._otherPort = this;
  }
  start() {}
  close() {}
  addEventListener(r, t) {
    r === "message" && this._handlers.push(t);
  }
  removeEventListener(r, t) {
    if (r !== "message") return;
    let s = this._handlers.indexOf(t);
    s >= 0 && this._handlers.splice(s, 1);
  }
  postMessage(r, t) {
    for (let s of this._otherPort._handlers) s({ data: r });
  }
};
a(S, "FakeMessagePort");
var L = class {
  constructor() {
    (this.port1 = new S()),
      (this.port2 = new S()),
      (this.port1._otherPort = this.port2),
      (this.port2._otherPort = this.port1);
  }
};
a(L, "FakeMessageChannel");
var X = L;
var Y = Symbol("Synclink.thrown"),
  $ = new WeakMap();
function G(e, r) {
  return $.set(e, r), e;
}
a(G, "transfer");
var he = a(
    (e) => (typeof e == "object" && e !== null) || typeof e == "function",
    "isObject",
  ),
  m = new Map();
function De(e) {
  return (
    ArrayBuffer.isView(e) ||
    Object.prototype.toString.call(e) === "[object ArrayBuffer]"
  );
}
a(De, "isArrayBufferOrView");
function ge(e) {
  return (
    !e ||
    typeof e == "string" ||
    typeof e == "boolean" ||
    typeof e == "number" ||
    Array.isArray(e) ||
    De(e) ||
    !e.constructor ||
    (e.constructor === Object &&
      Object.prototype.toString.call(e) === "[object Object]")
  );
}
a(ge, "isPlain");
function me(e, r = []) {
  if (r.includes(e)) return !0;
  if (!ge(e)) return !1;
  for (var t in e)
    if (
      e.hasOwnProperty(t) &&
      (!ge(e[t]) || (typeof e[t] == "object" && !me(e[t], r)))
    )
      return !1;
  return !0;
}
a(me, "isSerializable");
var we = {
  canHandle: (e) => he(e) && Y in e,
  serialize({ value: e }) {
    let r;
    return (
      e instanceof Error
        ? (r = {
            isError: !0,
            value: { message: e.message, name: e.name, stack: e.stack },
          })
        : (r = { isError: !1, value: e }),
      [r, []]
    );
  },
  deserialize(e) {
    throw e.isError
      ? Object.assign(new Error(e.value.message), e.value)
      : e.value;
  },
};
function V(e, r) {
  if (r && r.$$ep === e)
    return [{ type: "PROXY", message: r._as_message() }, []];
  if (r && r.constructor && r.constructor.name === "SynclinkTask")
    return [{ type: "PROXY", message: r.msg }, []];
  e._bypass && (q = !0);
  try {
    for (let [s, n] of m)
      if (n.canHandle(r)) {
        let [c, u] = n.serialize(r);
        return [{ type: "HANDLER", name: s, value: c }, u];
      }
  } finally {
    q = !1;
  }
  if (me(r, $.get(r))) return [{ type: "RAW", value: r }, $.get(r) || []];
  let t = ve(e, r);
  return [
    {
      type: "ID",
      store_key: t,
      endpoint_uuid: e[Z],
      ownkeys: Object.getOwnPropertyNames(r),
    },
    [],
  ];
}
a(V, "toWireValue");
function p(e, r) {
  switch (r.type) {
    case "HANDLER":
      return m.get(r.name).deserialize(r.value);
    case "RAW":
      return r.value;
    case "ID":
      return e[Z] === r.endpoint_uuid
        ? K(e, r.store_key)
        : E(e, { store_key: r.store_key });
  }
}
a(p, "fromWireValue");
var x = Symbol("Synclink.proxyStore"),
  Z = Symbol("Synclink.endpointUUID");
function B(e) {
  x in e ||
    ((e[x] = { objects: new Map(), counter: new Uint32Array([1]) }),
    (e[Z] = D()));
}
a(B, "storeCreate");
function K(e, r) {
  return e[x].objects.get(r);
}
a(K, "storeGetValue");
function ve(e, r) {
  x in e || B(e);
  let { objects: t, counter: s } = e[x];
  for (; t.has(s[0]); ) s[0] += 2;
  let n = s[0];
  return (s[0] += 2), t.set(n, r), n;
}
a(ve, "storeNewValue");
function Te(e, r) {
  let { objects: t } = e[x];
  t.delete(r), console.log("deleted", r, t);
}
a(Te, "storeDeleteKey");
function F(e) {
  return Object.assign(e, { [M]: !0 });
}
a(F, "proxy");
var q = !1,
  xe = {
    canHandle: (e) => he(e) && e[M],
    serialize(e) {
      let { port1: r, port2: t } = q ? new X() : new MessageChannel();
      return O(e, r), [t, [t]];
    },
    deserialize(e) {
      return e.start(), z(e);
    },
  };
m.set("throw", we);
m.set("proxy", xe);
m.set("headers", {
  canHandle(e) {
    return Object.prototype.toString.call(e) === "[object Headers]";
  },
  serialize(e) {
    return [Array.from(e), []];
  },
  deserialize(e) {
    return new Headers(e);
  },
});
export {
  X as FakeMessageChannel,
  R as Syncifier,
  v as createEndpoint,
  O as expose,
  j as interrupt_buffer,
  F as proxy,
  M as proxyMarker,
  U as releaseProxy,
  Oe as setInterruptHandler,
  G as transfer,
  m as transferHandlers,
  We as windowEndpoint,
  z as wrap,
};
//# sourceMappingURL=synclink.min.mjs.map
