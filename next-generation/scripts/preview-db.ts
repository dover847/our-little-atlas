import { Client } from "pg";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { resolve } from "node:path";

// Deliberately fixed to the NEW preview database. This tool cannot target Render.
export const previewProjectRef = "qlhrwneraccpqrthtavv";
export async function previewConnection() {
  const env = {
    ...parseEnv(readFileSync(resolve(".env.local"), "utf8")),
    ...process.env,
  };
  const publicUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  if (
    !publicUrl ||
    new URL(publicUrl).hostname !== `${previewProjectRef}.supabase.co`
  ) {
    throw new Error(
      "Refusing to use anything except the approved isolated preview project.",
    );
  }
  const connectionString = env.POSTGRES_URL;
  if (!connectionString)
    throw new Error("Pull the preview Development environment first.");
  const database = new URL(connectionString);
  const identity = `${database.hostname} ${decodeURIComponent(database.username)}`;
  if (!identity.includes(previewProjectRef))
    throw new Error("Database connection does not match the isolated preview.");
  // Explicit CA + hostname verification. Never work around TLS errors with
  // rejectUnauthorized:false; URL SSL options would override this configuration.
  for (const option of ["sslmode", "sslrootcert", "sslcert", "sslkey"])
    database.searchParams.delete(option);
  const client = new Client({
    connectionString: database.toString(),
    connectionTimeoutMillis: 15000,
    ssl: {
      ca: readFileSync(resolve("scripts/certs/supabase-root.crt"), "utf8"),
      rejectUnauthorized: true,
    },
  });
  await client.connect();
  return client;
}
