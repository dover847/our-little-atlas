"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/writing";
import { normalizedEmail } from "@/lib/writing";

export async function activateAccount(
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const password = String(form.get("password") || "");
  if (password.length < 12 || password.length > 128)
    return { error: "Choose a password between 12 and 128 characters." };
  if (password !== String(form.get("confirmation") || ""))
    return { error: "The two passwords need to match." };
  try {
    const client = await createClient();
    const accessToken = String(form.get("accessToken") || "");
    const refreshToken = String(form.get("refreshToken") || "");
    if (accessToken && refreshToken) {
      if (accessToken.length > 12000 || refreshToken.length > 1000)
        return { error: "This account invitation is unavailable." };
      const { error } = await client.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error)
        return {
          error:
            "This account invitation has expired. Request a fresh invitation.",
        };
    } else {
      const invitation = new URL(String(form.get("link") || ""));
      const expected = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
      if (
        invitation.origin !== expected.origin ||
        invitation.pathname !== "/auth/v1/verify"
      )
        return {
          error: "Paste the account confirmation link from your Atlas email.",
        };
      const type = invitation.searchParams.get("type");
      const hash =
        invitation.searchParams.get("token_hash") ||
        invitation.searchParams.get("token");
      if (
        !hash ||
        hash.length > 256 ||
        !["invite", "signup", "email", "recovery"].includes(type || "")
      )
        return { error: "Paste a valid account confirmation link." };
      const { error } = await client.auth.verifyOtp({
        token_hash: hash,
        type: type as "invite" | "signup" | "email" | "recovery",
      });
      if (error)
        return {
          error:
            "This account invitation is unavailable or has already been used. Request a fresh invitation if needed.",
        };
    }
    const {
      data: { user },
      error: identityError,
    } = await client.auth.getUser();
    if (identityError || !user?.email_confirmed_at)
      return { error: "Verify your email before setting up your account." };
    const { error } = await client.auth.updateUser({ password });
    if (error)
      return {
        error:
          "We couldn’t set this password. Choose a different strong password and try again.",
      };
  } catch {
    return {
      error:
        "Your account could not be activated. Check the email link and try again.",
    };
  }
  redirect("/space");
}

export async function requestFreshAccess(
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  try {
    const email = normalizedEmail(form.get("email"));
    const client = await createClient();
    const origin = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://127.0.0.1:3100";
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/activate`,
    });
    if (error)
      return {
        error:
          "A fresh link could not be requested right now. Please try again in a little while.",
      };
    return {
      error: "",
      message:
        "If this address has an Atlas account, a fresh access email is on its way. Copy its confirmation link into the field above before opening it.",
    };
  } catch {
    return { error: "Enter your invited email and try again." };
  }
}
