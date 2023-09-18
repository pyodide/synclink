import { Worker } from "node:worker_threads";
import * as Synclink from "../../dist/esm/synclink.mjs";
import nodeEndpoint from "../../dist/esm/node-adapter.mjs";
import { expect } from "chai";

describe("node", () => {
  describe("Synclink across workers", function () {
    beforeEach(function () {
      const worker = new Worker("./tests/node/worker.mjs");
      this.worker = worker;
    });

    afterEach(async function () {
      await this.worker.terminate();
    });

    it("can communicate", async function () {
      const proxy = Synclink.wrap(nodeEndpoint(this.worker));
      expect(await proxy(1, 3)).to.equal(4);
    });

    it("can communicate synchronously", function () {
      const proxy = Synclink.wrap(nodeEndpoint(this.worker));
      expect(proxy(1, 3).syncify()).to.equal(4);
    });

    it("can tunnels a new endpoint with createEndpoint", async function () {
      const proxy = Synclink.wrap(nodeEndpoint(this.worker));
      const otherEp = await proxy[Synclink.createEndpoint]();
      const otherProxy = Synclink.wrap(otherEp);
      expect(await otherProxy(20, 1)).to.equal(21);
    });
  });
});
