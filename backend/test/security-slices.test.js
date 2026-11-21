// test/security-slices.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { extractNonceFromSiweMessage } from "../src/services/auth.service.js";

test("extractNonceFromSiweMessage: should parse standard SIWE nonce", () => {
  const message = `example.com wants you to sign in with your Ethereum account:
0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5

Sign in with Ethereum to the app.

URI: https://example.com
Version: 1
Chain ID: 80002
Nonce: a1b2c3d4e5f6g7h8
Issued At: 2026-03-29T10:00:00.000Z`;

  const nonce = extractNonceFromSiweMessage(message);
  assert.equal(nonce, "a1b2c3d4e5f6g7h8");
});

test("extractNonceFromSiweMessage: should return null when Nonce is missing", () => {
  const invalidMessage = `example.com wants you to sign in:
URI: https://example.com`;
  const nonce = extractNonceFromSiweMessage(invalidMessage);
  assert.equal(nonce, null);
});

test("hashToken: should hash deterministically using SHA-256", async () => {
  const { hashToken } = await import("../src/services/auth.service.js");
  const hash1 = hashToken("test-refresh-token-123");
  const hash2 = hashToken("test-refresh-token-123");
  assert.equal(hash1, hash2);
  assert.equal(typeof hash1, "string");
  assert.equal(hash1.length, 64);
});
