import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";
import type { Config } from "../src/config.js";

const config: Config = {
  PORT: 4000,
  STELLAR_RPC_URL: "https://example.com",
  STELLAR_NETWORK: "testnet",
  CONTRACT_ID: `C${"A".repeat(55)}`,
  ALLOWED_ORIGIN: "http://localhost:3000",
};

test("health endpoint returns ok", async () => {
  const app = createApp(config, { resolve: async () => null });
  const server = app.listen(0);
  const address = server.address();
  assert(address && typeof address !== "string");
  const response = await fetch(`http://127.0.0.1:${address.port}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
  server.close();
});

test("rejects malformed aliases before resolving", async () => {
  let called = false;
  const app = createApp(config, { resolve: async () => { called = true; return null; } });
  const server = app.listen(0);
  const address = server.address();
  assert(address && typeof address !== "string");
  const response = await fetch(`http://127.0.0.1:${address.port}/v1/links/x`);
  assert.equal(response.status, 400);
  assert.equal(called, false);
  server.close();
});

