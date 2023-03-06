# Synclink

Synclink is designed to allow dispatch of work to a Worker or other browser
context. It allows both asynchronous and synchronous dispatch. The synchronous
dispatch is helpful because it allows async tasks to be accomplished in
synchronous contexts.

For most purposes [Comlink](https://github.com/GoogleChromeLabs/comlink) is
preferable. Synclink is primarily intended for use with
[Pyodide](https://github.com/pyodide/pyodide).

Synclink is a fork of [Comlink](https://github.com/GoogleChromeLabs/comlink) and
as such it currently has a similar API, but there have been significant changes.
Most Comlink code can be adapted fairly easily.

## Example

**main.js**

```javascript
import * as Synclink from "synclink.mjs";
function init() {
  const worker = Synclink.wrap(new Worker("worker.js"));
  let text = worker.fetch(url).syncify();
  // do something with text
}
init();
```

**worker.js**

```javascript
importScripts("synclink.js");

async function fetch(url) {
  const resp = await fetch(url);
  return await resp.text();
}

Synclink.expose(obj);
```

License Apache-2.0
