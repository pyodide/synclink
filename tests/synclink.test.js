import * as Synclink from "/base/dist/esm/synclink.mjs";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("test syncify", function () {
  beforeEach(async function () {
    this.worker = Synclink.wrap(
      new Worker("/base/tests/fixtures/synclink.test.worker.js"),
    );
    const fetch = window.fetch.bind(window);
    this.worker_scope = { fetch };
    await this.worker.set_global_scope(Synclink.proxy(this.worker_scope));
  });

  afterEach(function () {
    this.worker.terminate();
  });

  it("test syncify callback", async function () {
    let value;
    let result = await this.worker.usesCallback((x) => {
      value = x;
      return x + 12;
    });
    expect(value).to.equal(10);
    expect(result).to.equal(10 + 12);
  });

  it("test proxying fetch to main window", async function () {
    const ttt = 999;
    this.worker_scope.ttt = ttt;
    expect(await this.worker.get_from_main_window("ttt")).to.equal(ttt);
    expect(await this.worker.mainWindowFetchAsync("debug.html")).to.contain(
      "This file is almost the same as context.html",
    );
    expect(await this.worker.mainWindowFetchSync("debug.html")).to.contain(
      "This file is almost the same as context.html",
    );
  });

  /*

  it("simple schedule sync test", async function () {
    expect(
      await this.worker.fetchResponseAttrsWithSyncify("debug.html"),
    ).to.equal(
      JSON.stringify({
        type: "basic",
        redirected: false,
        status: 200,
        ok: true,
        statusText: "OK",
      }),
    );
  });

  it("test scheduling 5 calls together with syncify", async function () {
    this.x = 0;
    const delay = 10;
    let f = async () => {
      await sleep(delay);
      sleep(delay).then(() => this.x++);
      return this.x;
    };
    this.worker_scope.f = f;
    expect(await this.worker.scheduleSeveralSyncifyCalls("f")).to.equal(
      JSON.stringify([0, 0, 0, 0, 0]),
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
      JSON.stringify([0, 1, 2, 3, 4]),
    );
  });

  it("proxy_arg", async function () {
    function f() {
      return {
        method() {
          return "abc!!";
        },
      };
    }
    function g(x) {
      return x.method();
    }
    this.worker_scope.f = f;
    this.worker_scope.g = g;
    expect(await this.worker.proxy_arg_test()).to.equal("abc!!");
  });
  */
});
