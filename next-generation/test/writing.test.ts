import { test } from "node:test";
import assert from "node:assert/strict";
import { parseWriting, normalizedEmail } from "../src/lib/writing";
const space = "00000000-0000-4000-8000-000000000001";
function form(values: Record<string, string> = {}) {
  const f = new FormData();
  for (const [key, value] of Object.entries({
    spaceId: space,
    body: "A quiet thought.\nAnother line.",
    ...values,
  }))
    f.set(key, value);
  return f;
}
test("writing defaults private and preserves exact multiline text", () => {
  const parsed = parseWriting(form());
  assert.equal(parsed.visibility, "private");
  assert.equal(parsed.body, "A quiet thought.\nAnother line.");
  assert.equal(parsed.kind, "Reflection");
  assert.equal(parsed.space_id, space);
});
test("sharing is explicit and all identity and content fields are validated", () => {
  assert.equal(
    parseWriting(form({ visibility: "shared" })).visibility,
    "shared",
  );
  for (const invalid of [
    { spaceId: "forged" },
    { body: "   " },
    { body: "x".repeat(10001) },
    { title: "x".repeat(121) },
    { body: "bad\0value" },
    { visibility: "public" },
    { kind: "Relationship score" },
  ] as Record<string, string>[])
    assert.throws(() => parseWriting(form(invalid)));
});
test("email matching normalizes case without accepting malformed addresses", () => {
  assert.equal(normalizedEmail(" Person@Example.com "), "person@example.com");
  for (const email of ["", null, "bad@", "bad @example.com"])
    assert.throws(() => normalizedEmail(email));
});
