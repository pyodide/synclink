import { Worker, MessageChannel } from "node:worker_threads";
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

    it("can work with objects + syncify in same thread", function () {
      let fakePort1, fakePort2;
      const { port1, port2 } = new MessageChannel();
      ({ port1: fakePort1, port2: fakePort2 } =
        new Synclink.FakeMessageChannel());
      port1.start();
      port2.start();
      const thing = Synclink.wrap(fakePort1);
      Synclink.expose(
        {
          value: 4,
          func(n) {
            return n + 10;
          },
        },
        fakePort2,
      );
      expect(thing.value.syncify()).to.equal(4);
      expect(thing.func(5).syncify()).to.equal(15);
    });

    it("can communicate synchronously", async function () {
      const proxy = Synclink.wrap(nodeEndpoint(this.worker));
      expect(proxy(2, 4).syncify()).to.equal(6);
    });

    it("can tunnels a new endpoint with createEndpoint", async function () {
      const proxy = Synclink.wrap(nodeEndpoint(this.worker));
      const otherEp = await proxy[Synclink.createEndpoint]();
      const otherProxy = Synclink.wrap(otherEp);
      expect(await otherProxy(20, 1)).to.equal(21);
    });
  });
});
