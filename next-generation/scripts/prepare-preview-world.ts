import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { parseEnv } from "node:util";
import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { normalizedEmail } from "../src/lib/writing";
import { previewConnection, previewProjectRef } from "./preview-db";

async function main() {
  const args = process.argv.slice(2);
  function required(flag: string) {
    const index = args.indexOf(flag);
    if (index < 0 || !args[index + 1])
      throw Error("Missing explicit setup argument.");
    return args[index + 1];
  }
  if (!args.includes("--send"))
    throw Error("Email delivery requires explicit --send.");
  const owner = normalizedEmail(required("--owner")),
    member = normalizedEmail(required("--member"));
  if (owner === member) throw Error("Separate individual emails are required.");
  const origin = required("--preview");
  if (
    !/^https:\/\/atlas-next-generation-[a-z0-9]+-my-little-atlas\.vercel\.app$/.test(
      origin,
    )
  )
    throw Error("Exact isolated preview target required.");
  const env = {
    ...parseEnv(readFileSync(".env.local", "utf8")),
    ...process.env,
  };
  if (
    new URL(env.NEXT_PUBLIC_SUPABASE_URL!).hostname !==
    `${previewProjectRef}.supabase.co`
  )
    throw Error("Wrong Supabase target.");
  const publicKey =
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const settingsResponse = await fetch(
    `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`,
    { headers: { apikey: publicKey } },
  );
  if (!settingsResponse.ok)
    throw Error("Unable to verify email verification settings.");
  const settings = await settingsResponse.json();
  if (settings.mailer_autoconfirm !== false)
    throw Error("Email verification must be enabled before invitations.");
  const admin = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const database = await previewConnection();
  const results: { role: string; status: string; code?: string | number }[] =
    [];
  let ownerId = "";
  let spaceId = "";
  try {
    for (const [role, email] of [
      ["owner", owner],
      ["member", member],
    ]) {
      const { rows } = await database.query(
        "select id from auth.users where lower(email)=$1",
        [email],
      );
      if (rows.length) {
        if (role === "owner") ownerId = rows[0].id;
        results.push({
          role,
          status: "existing-account; no duplicate email sent",
        });
        continue;
      }
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${origin}/activate`,
      });
      if (error) {
        results.push({
          role,
          status: "email-not-sent",
          code: error.code || error.status,
        });
        if (role === "owner") break;
        continue;
      }
      if (role === "owner") ownerId = data.user.id;
      results.push({ role, status: "invitation-email-accepted-by-provider" });
    }
    if (ownerId) {
      await database.query("begin");
      try {
        await database.query("select pg_advisory_xact_lock(hashtext($1))", [
          ownerId,
        ]);
        await database.query(
          "insert into atlas_private.first_owners(email) values($1) on conflict do nothing",
          [owner],
        );
        const { rows: spaces } = await database.query(
          "select id from public.spaces where owner_id=$1",
          [ownerId],
        );
        if (spaces.length > 1)
          throw Error("Multiple spaces require an explicit selection.");
        spaceId =
          spaces[0]?.id ||
          (
            await database.query(
              "insert into public.spaces(name,owner_id) values($1,$2) returning id",
              ["Our little world", ownerId],
            )
          ).rows[0].id;
        await database.query(
          "insert into public.space_memberships(space_id,user_id,role) values($1,$2,'owner') on conflict do nothing",
          [spaceId, ownerId],
        );
        const { rows: members } = await database.query(
          "select m.user_id from public.space_memberships m join auth.users u on u.id=m.user_id where m.space_id=$1 and lower(u.email)=$2",
          [spaceId, member],
        );
        const { rows: pending } = await database.query(
          "select id from public.space_invitations where space_id=$1 and recipient_email=$2 and accepted_at is null and revoked_at is null and expires_at>now()",
          [spaceId, member],
        );
        if (!members.length && !pending.length) {
          const hash = createHash("sha256")
            .update(randomBytes(32).toString("base64url"))
            .digest("hex");
          await database.query(
            "insert into public.space_invitations(space_id,recipient_email,token_hash,created_by) values($1,$2,$3,$4)",
            [spaceId, member, hash, ownerId],
          );
        }
        await database.query("commit");
      } catch (error) {
        await database.query("rollback");
        throw error;
      }
    }
  } finally {
    await database.end();
  }
  mkdirSync(".atlas-local", { recursive: true });
  writeFileSync(
    ".atlas-local/invitation-report.private.json",
    JSON.stringify(
      {
        at: new Date().toISOString(),
        preview: origin,
        owner,
        member,
        spaceId,
        results,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({ spacePrepared: !!spaceId, invitations: results }, null, 2),
  );
  if (results.some((result) => result.status === "email-not-sent"))
    process.exitCode = 1;
}
main().catch(() => {
  console.error(
    "Preview setup stopped. No production service was touched. Check the private setup target and provider configuration.",
  );
  process.exitCode = 1;
});
