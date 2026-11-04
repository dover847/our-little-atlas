import { test } from "node:test";
import assert from "node:assert/strict";
import { recoveredSession } from "../src/lib/activation";
test("recovers sign-in fragments from an unreachable local redirect without navigating to it", () => {
  assert.deepEqual(
    recoveredSession(
      "http://localhost:3000/#access_token=test-access&refresh_token=test-refresh&type=invite",
    ),
    { access: "test-access", refresh: "test-refresh" },
  );
  assert.deepEqual(
    recoveredSession(
      "https://example.com/activate#access_token=test-access&refresh_token=test-refresh",
    ),
    { access: "test-access", refresh: "test-refresh" },
  );
});
test("rejects missing, malformed and excessive session fragments", () => {
  for (const value of [
    "not a URL",
    "javascript:alert(1)",
    "https://example.com/#access_token=x",
    `https://example.com/#access_token=${"x".repeat(12001)}&refresh_token=y`,
  ])
    assert.equal(recoveredSession(value), null);
});
