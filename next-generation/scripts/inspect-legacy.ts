import { readFileSync } from "node:fs";
import { inspectLegacy } from "../src/lib/legacy-inspection";

const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== "--file") {
  console.error(
    "Usage: npm run migration:inspect -- --file <private-local-snapshot.json>",
  );
  process.exitCode = 1;
} else {
  try {
    // Only counts/fingerprint, never journal text, photos or capsule contents.
    console.log(
      JSON.stringify(inspectLegacy(readFileSync(args[1], "utf8")), null, 2),
    );
  } catch {
    console.error(
      "Snapshot inspection failed. Preserve the file and inspect its JSON shape privately.",
    );
    process.exitCode = 1;
  }
}
