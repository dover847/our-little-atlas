"use client";
import { useActionState, useEffect, useState } from "react";
import { activateAccount } from "./actions";
import { initialResult } from "@/lib/writing";
import { recoveredSession } from "@/lib/activation";
import { requestFreshAccess } from "./actions";

export function ActivateForm() {
  const [state, action, pending] = useActionState(
    activateAccount,
    initialResult,
  );
  const [tokens, setTokens] = useState({ access: "", refresh: "" });
  const [link, setLink] = useState("");
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    setTokens({
      access: hash.get("access_token") || "",
      refresh: hash.get("refresh_token") || "",
    });
    if (window.location.hash)
      window.history.replaceState(null, "", window.location.pathname);
  }, []);
  return (
    <form action={action} className="studio-form">
      <input type="hidden" name="accessToken" value={tokens.access} />
      <input type="hidden" name="refreshToken" value={tokens.refresh} />
      {!tokens.access && (
        <>
          <label htmlFor="account-email-link">
            Account confirmation link from your email
          </label>
          <textarea
            id="account-email-link"
            name="link"
            rows={3}
            value={link}
            onChange={(e) => {
              const session = recoveredSession(e.target.value);
              if (session) {
                setTokens(session);
                setLink("");
              } else setLink(e.target.value);
            }}
            autoComplete="off"
            spellCheck={false}
            required
          />
          <p className="field-help">
            Paste the confirmation button’s link from your email. If you already
            clicked it and landed on an unreachable page, copy that page’s
            entire address here instead. Do not send that address in chat.
          </p>
        </>
      )}
      {tokens.access && (
        <p className="field-help" role="status">
          Your sign-in details were recovered. Choose your own password below.
        </p>
      )}
      <label htmlFor="new-password">Choose your own password</label>
      <input
        id="new-password"
        name="password"
        type="password"
        minLength={12}
        maxLength={128}
        autoComplete="new-password"
        required
      />
      <label htmlFor="confirm-password">Confirm your password</label>
      <input
        id="confirm-password"
        name="confirmation"
        type="password"
        minLength={12}
        maxLength={128}
        autoComplete="new-password"
        required
      />
      {state.error && (
        <p role="alert" className="auth-error">
          {state.error}
        </p>
      )}
      <button className="button-dark" disabled={pending}>
        {pending ? "Preparing your account…" : "Activate my account"}
      </button>
    </form>
  );
}

export function FreshAccessForm() {
  const [state, action, pending] = useActionState(
    requestFreshAccess,
    initialResult,
  );
  return (
    <details className="registration-details">
      <summary>Link already used or expired? Request fresh access</summary>
      <form action={action} className="studio-form">
        <label htmlFor="access-email">Your invited email</label>
        <input
          id="access-email"
          name="email"
          type="email"
          maxLength={254}
          autoComplete="email"
          required
        />
        {state.error && (
          <p className="auth-error" role="alert">
            {state.error}
          </p>
        )}
        {state.message && (
          <p className="field-help" role="status">
            {state.message}
          </p>
        )}
        <button className="button-dark" disabled={pending}>
          {pending ? "Requesting access…" : "Email me a fresh access link"}
        </button>
      </form>
    </details>
  );
}
