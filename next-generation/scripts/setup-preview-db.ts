import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { previewConnection } from "./preview-db";

async function main() {
  const sql = readFileSync(
    "supabase/migrations/0001_private_spaces.sql",
    "utf8",
  );
  const checksum = createHash("sha256").update(sql).digest("hex");
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
    const { rows } = await client.query(
      "select checksum from atlas_migrations.applied where name=$1",
      ["0001_private_spaces"],
    );
    if (rows.length && rows[0].checksum !== checksum)
      throw new Error(
        "Applied migration differs; create a new migration instead of rewriting history.",
      );
    if (!rows.length) {
      await client.query(sql);
      await client.query(
        "insert into atlas_migrations.applied(name, checksum) values ($1,$2)",
        ["0001_private_spaces", checksum],
      );
    }
    await client.query("commit");
    console.log(
      rows.length
        ? "Preview schema already applied; checksum verified."
        : "Private-space foundation applied to isolated preview only.",
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
