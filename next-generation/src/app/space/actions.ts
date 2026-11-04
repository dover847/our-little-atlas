"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  normalizedEmail,
  parseWriting,
  uuidPattern,
  type ActionResult,
} from "@/lib/writing";

async function authenticated() {
  const client = await createClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user || !user.email_confirmed_at)
    throw new Error("Please sign in with your verified account.");
  return { client, user };
}

export async function createFirstSpace(
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  let destination = "";
  try {
    const name = String(form.get("name") || "").trim();
    if (!name || name.length > 120)
      return { error: "Give your world a name of up to 120 characters." };
    const { client } = await authenticated();
    const { data, error } = await client.rpc("create_first_space", {
      space_name: name,
    });
    if (error || typeof data !== "string")
      return {
        error:
          "First-owner access is not available for this account. An invitation can connect you to an existing space.",
      };
    destination = data;
  } catch {
    return {
      error: "Please sign in with your verified account and try again.",
    };
  }
  redirect(`/space/${destination}`);
}

export async function saveWriting(
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  try {
    const values = parseWriting(form);
    const id = String(form.get("id") || "");
    const { client, user } = await authenticated();
    let saved: { id: string; version: number } | null = null;
    if (id) {
      const version = Number(form.get("version"));
      if (
        !uuidPattern.test(id) ||
        !Number.isSafeInteger(version) ||
        version < 1
      )
        return { error: "Reload this page before editing." };
      const { data, error } = await client
        .from("writing_entries")
        .update({
          title: values.title,
          body: values.body,
          kind: values.kind,
          visibility: values.visibility,
        })
        .eq("id", id)
        .eq("space_id", values.space_id)
        .eq("author_id", user.id)
        .eq("version", version)
        .select("id,version")
        .maybeSingle();
      if (error || !data)
        return {
          error:
            "This page changed or is no longer available. Your words are still here; reload the latest version before saving again.",
        };
      saved = data;
    } else {
      const requestId = String(form.get("requestId") || "");
      if (!uuidPattern.test(requestId))
        return { error: "Wait for this page to finish opening before saving." };
      const { data, error } = await client
        .from("writing_entries")
        .insert({ ...values, client_request_id: requestId })
        .select("id,version")
        .single();
      if (error?.code === "23505") {
        const { data: existing } = await client
          .from("writing_entries")
          .select("id,version,space_id,title,body,kind,visibility")
          .eq("author_id", user.id)
          .eq("client_request_id", requestId)
          .maybeSingle();
        if (
          existing &&
          Object.entries(values).every(
            ([key, value]) => existing[key as keyof typeof values] === value,
          )
        )
          saved = existing;
      } else if (!error) saved = data;
      if (!saved)
        return {
          error:
            "Your page could not be saved. Your words are still here. Please try again.",
        };
    }
    revalidatePath(`/space/${values.space_id}`);
    return {
      error: "",
      entryId: saved.id,
      version: saved.version,
      message:
        values.visibility === "shared"
          ? "Saved and shared with this space."
          : "Saved privately. Only you can read this page.",
    };
  } catch (error) {
    return {
      error:
        error instanceof Error && /Choose|Add your/.test(error.message)
          ? error.message
          : "Please sign in and check your entry before trying again.",
    };
  }
}

export async function createInvitation(
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  try {
    const recipient = normalizedEmail(form.get("email"));
    const spaceId = String(form.get("spaceId") || "");
    if (!uuidPattern.test(spaceId)) return { error: "Choose a valid space." };
    const { client } = await authenticated();
    const token = randomBytes(32).toString("base64url");
    const { error } = await client.rpc("create_space_invitation", {
      target_space: spaceId,
      recipient,
      secret_hash: createHash("sha256").update(token).digest("hex"),
    });
    if (error)
      return {
        error:
          "Only the space owner can create invitations. If you have created many today, try again tomorrow.",
      };
    revalidatePath(`/space/${spaceId}`);
    return {
      error: "",
      invitation: token,
      message:
        "Invitation created for this email. Share the link privately; it expires in seven days.",
    };
  } catch {
    return {
      error:
        "Check the email address and sign in with your verified owner account.",
    };
  }
}

export async function acceptInvitation(
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  let destination = "";
  try {
    const token = String(form.get("token") || "");
    if (!/^[A-Za-z0-9_-]{43}$/.test(token))
      return { error: "Paste a valid invitation link or code." };
    const { client } = await authenticated();
    const { data, error } = await client.rpc("accept_space_invitation", {
      invitation_secret: token,
    });
    if (error || typeof data !== "string")
      return {
        error:
          "This invitation is unavailable. Check that you are signed in with its intended email and that the link has not expired or been used.",
      };
    destination = data;
  } catch {
    return {
      error: "Sign in with the invited email address before accepting.",
    };
  }
  redirect(`/space/${destination}`);
}

export async function revokeInvitation(form: FormData) {
  const id = String(form.get("id") || "");
  const spaceId = String(form.get("spaceId") || "");
  if (!uuidPattern.test(id) || !uuidPattern.test(spaceId)) return;
  const { client } = await authenticated();
  const { error } = await client.rpc("revoke_space_invitation", {
    invitation_id: id,
  });
  if (error) return;
  revalidatePath(`/space/${spaceId}`);
}

export async function acceptEmailInvitation(
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  let destination = "";
  try {
    const id = String(form.get("id") || "");
    if (!uuidPattern.test(id))
      return { error: "This invitation is unavailable." };
    const { client } = await authenticated();
    const { data, error } = await client.rpc("accept_email_invitation", {
      invitation_id: id,
    });
    if (error || typeof data !== "string")
      return {
        error:
          "This invitation is unavailable. It may have expired or already been used.",
      };
    destination = data;
  } catch {
    return {
      error: "Sign in with the verified invited email before accepting.",
    };
  }
  redirect(`/space/${destination}`);
}

export async function registerForInvitation(
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  try {
    const email = normalizedEmail(form.get("email"));
    const password = String(form.get("password") || "");
    const token = String(form.get("token") || "");
    if (
      password.length < 12 ||
      password.length > 128 ||
      !/^[A-Za-z0-9_-]{43}$/.test(token)
    )
      return {
        error: "Use a valid invitation and a password of 12–128 characters.",
      };
    const client = await createClient();
    const { data: allowed, error: checkError } = await client.rpc(
      "can_register_for_invitation",
      { invitation_secret: token, recipient: email },
    );
    if (checkError || allowed !== true)
      return {
        error: "This invitation is unavailable for this email address.",
      };
    const origin = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://127.0.0.1:3100";
    const { error } = await client.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${origin}/auth/callback` },
    });
    if (error)
      return {
        error:
          "Account setup is unavailable right now. Check your details or try again later.",
      };
    return {
      error: "",
      message:
        "Check your email to confirm your account. You can also paste the confirmation link on the Activate account page. Then return here to accept your private space invitation.",
    };
  } catch {
    return {
      error: "Check your invitation, email and password before trying again.",
    };
  }
}
