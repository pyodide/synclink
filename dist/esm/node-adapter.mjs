var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/node-adapter.ts
function nodeEndpoint(nep) {
  const listeners = /* @__PURE__ */ new WeakMap();
  return {
    postMessage: nep.postMessage.bind(nep),
    addEventListener: (_, eh) => {
      const l = /* @__PURE__ */ __name((data) => {
        if ("handleEvent" in eh) {
          eh.handleEvent({ data });
        } else {
          eh({ data });
        }
      }, "l");
      nep.on("message", l);
      listeners.set(eh, l);
    },
    removeEventListener: (_, eh) => {
      const l = listeners.get(eh);
      if (!l) {
        return;
      }
      nep.off("message", l);
      listeners.delete(eh);
    },
    start: nep.start && nep.start.bind(nep)
  };
}
__name(nodeEndpoint, "nodeEndpoint");
export {
  nodeEndpoint as default
};
//# sourceMappingURL=node-adapter.mjs.map
