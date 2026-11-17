"use server";

import "server-only";
import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createUserClient } from "@/lib/supabase/server";

type Result = { error: string };
const unavailable = "This reset link has expired or was already used. Request a new private link.";

export async function resetOwnerPassword(
  _previous: Result,
  form: FormData,
): Promise<Result> {
  const token = String(form.get("token") || "");
  const password = String(form.get("password") || "");
  const confirmation = String(form.get("confirmation") || "");

  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return {error: unavailable};
  if (password.length < 12 || password.length > 128)
    return {error:"Please choose a password between 12 and 128 characters."};
  if (password !== confirmation)
    return {error:"Your new passwords don't match."};

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey)
      return {error:"Password reset is temporarily unavailable."};

    const admin = createAdminClient(url, serviceKey, {
      auth:{persistSession:false, autoRefreshToken:false},
    });
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const now = new Date().toISOString();
    const {data:link, error:lookupError} = await admin
      .from("atlas_password_reset_links")
      .select("user_id")
      .eq("token_hash",tokenHash)
      .is("redeemed_at",null)
      .gt("expires_at",now)
      .maybeSingle();

    if (lookupError || !link) return {error:unavailable};
    // Never let a token for another user reset this owner's password.
    const {data:identity,error:identityError} =
      await admin.auth.admin.getUserById(link.user_id);
    const email = identity?.user?.email?.trim().toLowerCase();
    if (identityError || !identity?.user?.email_confirmed_at ||
        email !== "dover847@gmail.com")
      return {error:unavailable};
    const {data:ownedSpace,error:ownershipError} = await admin
      .from("spaces").select("id").eq("owner_id",link.user_id)
      .limit(1).maybeSingle();
    if (ownershipError || !ownedSpace) return {error:unavailable};

    // Atomically consume the one-time link. A concurrent request cannot reuse it.
    const {data:consumed,error:consumeError} = await admin
      .from("atlas_password_reset_links")
      .update({redeemed_at:now})
      .eq("token_hash",tokenHash)
      .eq("user_id",link.user_id)
      .is("redeemed_at",null)
      .gt("expires_at",now)
      .select("user_id")
      .maybeSingle();
    if (consumeError || !consumed) return {error:unavailable};

    const {error:updateError} = await admin.auth.admin.updateUserById(
      consumed.user_id,{password}
    );
    if (updateError)
      return {error:"Your password couldn't be saved. Please request another private link."};

    const client = await createUserClient();
    const {error:signInError} = await client.auth.signInWithPassword({
      email:email!, password,
    });
    if (signInError) return {
      error:"Your new password was saved, but automatic sign-in did not complete. Use the regular sign-in page with your new password.",
    };
  } catch {
    return {error:"We couldn't finish the reset. If your new password was saved, try the regular sign-in page."};
  }

  redirect("/full-atlas");
}
