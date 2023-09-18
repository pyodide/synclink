"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) =>
  __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if ((from && typeof from === "object") || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, {
          get: () => from[key],
          enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable,
        });
  }
  return to;
};
var __toCommonJS = (mod) =>
  __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/node-adapter.ts
var node_adapter_exports = {};
__export(node_adapter_exports, {
  default: () => nodeEndpoint,
});
module.exports = __toCommonJS(node_adapter_exports);
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
    start: nep.start && nep.start.bind(nep),
  };
}
__name(nodeEndpoint, "nodeEndpoint");
//# sourceMappingURL=node-adapter.js.map
