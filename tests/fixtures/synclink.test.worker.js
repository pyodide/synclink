importScripts("/base/dist/umd/comlink.js");
async function get_from_main_window(x) {
  return await self.main_window[x];
}

async function test(x) {
  let resp = await self.main_window.fetch(x);
  console.log(resp);
  let value = await resp.text();
  return value;
}

function test2(x) {
  let resp = self.main_window.fetch(x).syncify();
  let value = resp.text().syncify();
  return value;
}
function test3(x) {
  const resp = self.main_window.fetch(x).syncify();
  const scheduled = {};
  const keys = ["type", "redirected", "status", "ok", "statusText"];
  for (let key of keys) {
    scheduled[key] = resp[key].schedule_sync();
  }
  const results = {};
  for (let key of keys) {
    results[key] = scheduled[key].syncify();
  }
  return JSON.stringify(results);
}

function test4(name) {
  const tasks = [];
  for (let i = 0; i < 5; i++) {
    console.log("i", i);
    tasks.push(self.main_window[name]().schedule_sync());
  }
  const results = [];
  for (let task of tasks) {
    console.log("syncify", task);
    results.push(task.syncify());
  }
  return JSON.stringify(results);
}

function test5(name) {
  const results = [];
  for (let i = 0; i < 5; i++) {
    results.push(self.main_window[name]().syncify());
  }
  return JSON.stringify(results);
}

function proxy_arg_test(){
  const x = self.main_window.f().syncify();
  return self.main_window.g(x);
}

function set_global_scope(window) {
  self.main_window = window;
}

Comlink.expose({
  get_from_main_window,
  set_global_scope,
  test,
  test2,
  test3,
  test4,
  test5,
  proxy_arg_test,
});
