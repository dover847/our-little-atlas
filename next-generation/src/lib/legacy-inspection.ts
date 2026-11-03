import { createHash } from "node:crypto";

const arrays = [
  "spins",
  "favorites",
  "ideas",
  "journal",
  "customActivities",
  "mirrors",
  "clarity",
  "assumptions",
  "capsules",
] as const;
const objects = ["notes", "weather"] as const;
const knownKeys = new Set<string>([
  "revision",
  "selected",
  ...arrays,
  ...objects,
]);
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

// A read-only prerequisite to migration. Does not normalize or discard source data.
export function inspectLegacy(source: string) {
  const value: unknown = JSON.parse(source);
  if (!record(value)) throw new Error("Legacy state must be a JSON object.");
  const counts: Record<string, number> = {};
  const missing: string[] = [];
  for (const key of arrays) {
    if (!(key in value)) {
      missing.push(key);
      continue;
    }
    if (!Array.isArray(value[key]))
      throw new Error(`Invalid collection shape: ${key}`);
    counts[key] = value[key].length;
  }
  for (const key of objects) {
    if (!(key in value)) {
      missing.push(key);
      continue;
    }
    if (!record(value[key]))
      throw new Error(`Invalid collection shape: ${key}`);
    counts[key] = Object.keys(value[key]).length;
  }
  if (
    "revision" in value &&
    (!Number.isSafeInteger(value.revision) || Number(value.revision) < 0)
  )
    throw new Error("Invalid revision.");
  const unknownKeys = Object.keys(value)
    .filter((key) => !knownKeys.has(key))
    .sort();
  const sealedCapsules = Array.isArray(value.capsules)
    ? value.capsules.filter(
        (capsule) => record(capsule) && capsule.sealed === true,
      )
    : [];
  if (sealedCapsules.length)
    throw new Error(
      "Redacted API exports cannot serve as full capsule backups. Use the authoritative disk snapshot.",
    );
  return {
    mode: "read-only-dry-run" as const,
    sha256: createHash("sha256").update(source).digest("hex"),
    byteLength: Buffer.byteLength(source),
    counts,
    missing,
    unknownKeys,
    historicalIdentity: "unverified-labels" as const,
    warnings: [
      ...(unknownKeys.length
        ? [
            "Unknown fields must be preserved in the private source archive before mapping.",
          ]
        : []),
      "No data has been imported. Preserve this exact source file and verify its checksum.",
    ],
  };
}
