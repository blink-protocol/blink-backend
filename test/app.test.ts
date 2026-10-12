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

test("rejects unsafe destinations without returning the URL", async () => {
  const app = createApp(config, {
    resolve: async () => ({
      owner: "G".padEnd(56, "A"),
      destination: "javascript:alert(1)",
      active: true,
      created_at: 1n,
      updated_at: 1n,
    }),
  });
  const server = app.listen(0);
  const address = server.address();
  assert(address && typeof address !== "string");
  const response = await fetch(`http://127.0.0.1:${address.port}/v1/links/stellar`);
  assert.equal(response.status, 422);
  const body = await response.json();
  assert.deepEqual(body, { error: "unsafe_destination" });
  assert.equal("destination" in body, false);
  server.close();
});

test("passphrase mapping covers testnet and public", async () => {
  const { passphraseForNetwork } = await import("../src/registry.js");
  const { Networks } = await import("@stellar/stellar-sdk");
  assert.equal(passphraseForNetwork("testnet"), Networks.TESTNET);
  assert.equal(passphraseForNetwork("public"), Networks.PUBLIC);
});

