import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  activities,
  categories,
  filterActivities,
  landingRotation,
  validateSelection,
} from "../src/lib/activities";

test("all original activities are retained with unique IDs and searchable chapters", () => {
  assert.equal(activities.length, 72);
  assert.deepEqual(
    activities,
    JSON.parse(readFileSync("../our-little-atlas/activities.json", "utf8")),
  );
  assert.equal(new Set(activities.map((a) => a.id)).size, 72);
  assert.ok(categories.length > 1);
  assert.equal(filterActivities("  abstract WORD  ", "all")[0].id, 1);
  const category = categories[0];
  assert.ok(
    filterActivities("", category).every((a) => a.category === category),
  );
  assert.deepEqual(
    filterActivities("", "all", [1, 3]).map((a) => a.id),
    [1, 3],
  );
  assert.equal(filterActivities("", "all", []).length, 0);
});

test("server selection rejects forged, excessive and coerced identifiers", () => {
  for (const invalid of [
    null,
    [],
    {},
    ["1"],
    [9999],
    [1.2],
    Array(73).fill(1),
  ]) {
    assert.throws(() => validateSelection(invalid));
  }
  assert.deepEqual(validateSelection([1, 1, 72]), [1, 72]);
});

test("wheel midpoint matches the server choice across repeated spins and every chapter size", () => {
  for (const count of [1, 3, 8, 12, 72]) {
    let previous = 0;
    for (let index = 0; index < count; index++) {
      const angle = landingRotation(previous, index, count);
      assert.ok(angle - previous >= 1440);
      const midpoint = (angle + ((index + 0.5) * 360) / count) % 360;
      assert.ok(Math.min(midpoint, 360 - midpoint) < 0.00001);
      previous = angle;
    }
  }
});
