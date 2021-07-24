import * as Comlink from "/base/dist/esm/comlink.mjs";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("xxx xxxx xxxxx", function () {
  beforeEach(async function () {
    this.worker = Comlink.wrap(
      new Worker("/base/tests/fixtures/synclink.test.worker.js")
    );
    const fetch = window.fetch.bind(window);
    this.worker_scope = { fetch };
    await this.worker.set_global_scope(Comlink.proxy(this.worker_scope));
  });

  afterEach(function () {
    this.worker.terminate();
  });

  it("blah", async function () {
    const ttt = 999;
    this.worker_scope.ttt = ttt;
    expect(await this.worker.get_from_main_window("ttt")).to.equal(ttt);
    expect(await this.worker.test("debug.html")).to.contain(
      "This file is almost the same as context.html"
    );
    expect(await this.worker.test2("debug.html")).to.contain(
      "This file is almost the same as context.html"
    );
  });

  it("blah3", async function () {
    expect(await this.worker.test3("debug.html")).to.equal(
      JSON.stringify({
        type: "basic",
        redirected: false,
        status: 200,
        ok: true,
        statusText: "OK",
      })
    );
  });

  it("blah4", async function () {
    this.x = 0;
    const delay = 10;
    let f = async () => {
      await sleep(delay);
      sleep(delay).then(() => this.x++);
      return this.x;
    };
    this.worker_scope.f = f;
    expect(await this.worker.test4("f")).to.equal(
      JSON.stringify([0, 0, 0, 0, 0])
    );
  });

  it("blah5", async function () {
    this.x = 0;
    const delay = 10;
    let f = async () => {
      await sleep(delay);
      sleep(delay).then(() => this.x++);
      return this.x;
    };
    this.worker_scope.f = f;
    expect(await this.worker.test5("f")).to.equal(
      JSON.stringify([0, 1, 2, 3, 4])
    );
  });
});
