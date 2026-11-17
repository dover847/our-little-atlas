import { test } from "node:test";
import assert from "node:assert/strict";
import { inspectLegacy } from "../src/lib/legacy-inspection";

test("dry-run is deterministic, retains source bytes and discovers unknown fields without exposing content", () => {
  const snapshot = JSON.stringify({
    revision: 7,
    notes: { "1": { Danny: "private sentinel" } },
    journal: [{ text: "private sentinel" }],
    capsules: [{ openAt: "2040-01-01", message: "private sentinel" }],
    futureKey: { preserved: true },
  });
  const before = snapshot;
  const first = inspectLegacy(snapshot);
  assert.deepEqual(first, inspectLegacy(snapshot));
  assert.equal(snapshot, before);
  assert.equal(first.counts.journal, 1);
  assert.equal(first.counts.capsules, 1);
  assert.deepEqual(first.unknownKeys, ["futureKey"]);
  assert.equal(JSON.stringify(first).includes("private sentinel"), false);
  assert.notEqual(first.sha256, inspectLegacy(snapshot + "\n").sha256);
});

test("malformed state and redacted exports fail closed before any import", () => {
  for (const snapshot of [
    "null",
    "[]",
    "{broken",
    '{"journal":{}}',
    '{"notes":[]}',
    '{"revision":-1}',
    '{"capsules":[{"sealed":true}]}',
  ]) {
    assert.throws(() => inspectLegacy(snapshot));
  }
});
