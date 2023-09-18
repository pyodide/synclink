var a = Object.defineProperty;
var o = (e, n) => a(e, "name", { value: n, configurable: !0 });
function d(e) {
  let n = new WeakMap();
  return {
    postMessage: e.postMessage.bind(e),
    addEventListener: (r, t) => {
      let s = o((i) => {
        "handleEvent" in t ? t.handleEvent({ data: i }) : t({ data: i });
      }, "l");
      e.on("message", s), n.set(t, s);
    },
    removeEventListener: (r, t) => {
      let s = n.get(t);
      s && (e.off("message", s), n.delete(t));
    },
    start: e.start && e.start.bind(e),
  };
}
o(d, "nodeEndpoint");
export { d as default };
//# sourceMappingURL=node-adapter.min.mjs.map
