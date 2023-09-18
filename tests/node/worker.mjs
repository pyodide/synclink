import { parentPort } from "worker_threads";
import * as Synclink from "../../dist/esm/synclink.mjs";
import nodeEndpoint from "../../dist/esm/node-adapter.mjs";

Synclink.expose((a, b) => a + b, nodeEndpoint(parentPort));
