import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { previewConnection } from "./preview-db";

async function main() {
  const migrations = readdirSync("supabase/migrations")
    .filter((name) => /^\d{4}_[a-z_]+\.sql$/.test(name))
    .sort();
  const client = await previewConnection();
  try {
    await client.query("begin");
    await client.query(
      "select pg_advisory_xact_lock(hashtext('atlas-preview-migrations'))",
    );
    await client.query("create schema if not exists atlas_migrations");
    await client.query(
      "revoke all on schema atlas_migrations from public, anon, authenticated",
    );
    await client.query(
      "create table if not exists atlas_migrations.applied (name text primary key, checksum text not null, applied_at timestamptz not null default now())",
    );
    for (const filename of migrations) {
      // Git uses LF; Windows checkout conversion must not change SQL fingerprints.
      const sql = readFileSync(
        `supabase/migrations/${filename}`,
        "utf8",
      ).replace(/\r\n/g, "\n");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const name = filename.replace(/\.sql$/, "");
      const { rows } = await client.query(
        "select checksum from atlas_migrations.applied where name=$1",
        [name],
      );
      if (rows.length && rows[0].checksum !== checksum)
        throw new Error(
          "Applied migration differs; add a new migration instead.",
        );
      if (!rows.length) {
        await client.query(sql);
        await client.query(
          "insert into atlas_migrations.applied(name,checksum) values($1,$2)",
          [name, checksum],
        );
      }
    }
    await client.query("commit");
    console.log(
      `Preview schema verified: ${migrations.length} migrations applied or checksum-matched.`,
    );
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}
main().catch(() => {
  console.error(
    "Preview schema setup failed. No migration was committed. Check preview configuration and database access.",
  );
  process.exitCode = 1;
});
