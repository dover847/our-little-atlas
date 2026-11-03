"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signIn(_previous: { error: string }, form: FormData) {
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    password.length > 256 ||
    !password
  ) {
    return {
      error:
        "Enter the email and password for your individual preview account.",
    };
  }
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error)
      return {
        error:
          "We couldn’t sign you in. Check your details or try again in a little while.",
      };
  } catch {
    return {
      error: "Sign-in is temporarily unavailable. Please try again later.",
    };
  }
  redirect("/space");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
