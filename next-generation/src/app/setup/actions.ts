"use server";

import "server-only";
import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createUserClient } from "@/lib/supabase/server";

type SetupResult = { error: string };
const unavailable = "This private invitation is unavailable or has expired. Ask the Atlas owner for a fresh private link.";

export async function setUpInvitedAccount(
  _previous: SetupResult,
  form: FormData,
): Promise<SetupResult> {
  const token = String(form.get("token") || "");
  const password = String(form.get("password") || "");
  const confirmation = String(form.get("confirmation") || "");
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return { error: unavailable };
  if (password.length < 12 || password.length > 128)
    return { error: "Choose a password of 12 to 128 characters." };
  if (password !== confirmation)
    return { error: "The two passwords do not match." };

  let destination = "/space";
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      console.error("Atlas private setup: server configuration unavailable");
      return { error: "Atlas setup is temporarily unavailable. Please contact the owner." };
    }
    // This privileged client stays exclusively on the server. Never expose
    // the service key, invitation token, or account details in an error.
    const admin = createAdminClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const { data: invitation, error: invitationError } = await admin
      .from("space_invitations")
      .select("id,recipient_email,space_id")
      .eq("token_hash", tokenHash)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (invitationError || !invitation) return { error: unavailable };

    const { data: identities, error: identitiesError } =
      await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (identitiesError || !identities?.users)
      return { error: "Atlas setup is temporarily unavailable. Please try later." };
    const recipient = String(invitation.recipient_email).trim().toLowerCase();
    const user = identities.users.find(
      (account) => account.email?.trim().toLowerCase() === recipient,
    );
    if (!user || !user.email_confirmed_at) return { error: unavailable };

    // The invitation is a 256-bit bearer secret issued by the space owner.
    // This flow intentionally bypasses misconfigured third-party email redirects,
    // but requires possession of that private link and a previously verified account.
    const { error: updateError } = await admin.auth.admin.updateUserById(
      user.id,
      { password },
    );
    if (updateError)
      return { error: "Could not save that password. Please choose a different strong password." };

    const client = await createUserClient();
    const { error: signInError } = await client.auth.signInWithPassword({
      email: recipient,
      password,
    });
    if (signInError) {
      return {
        error: "Your password was saved, but sign-in did not finish. Open the regular sign-in page using your new password.",
      };
    }

    const { data: spaceId, error: membershipError } = await client.rpc(
      "accept_space_invitation",
      { invitation_secret: token },
    );
    if (membershipError || typeof spaceId !== "string") {
      // Account activation succeeded. Do not show a misleading password error.
      // The member can still see a pending invite on their /space page.
      destination = "/space";
    } else {
      destination = `/space/${spaceId}`;
    }
  } catch {
    return {
      error: "Atlas setup could not finish. If you already chose a password, try signing in with it.",
    };
  }
  redirect(destination);
}
