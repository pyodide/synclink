import { parentPort } from "node:worker_threads";
import * as Synclink from "../../dist/esm/synclink.mjs";
import nodeEndpoint from "../../dist/esm/node-adapter.mjs";

Synclink.expose((a, b) => Promise.resolve(a + b), nodeEndpoint(parentPort));
