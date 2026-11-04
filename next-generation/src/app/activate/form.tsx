"use client";
import { useActionState, useEffect, useState } from "react";
import { activateAccount } from "./actions";
import { initialResult } from "@/lib/writing";

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
            onChange={(e) => setLink(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            required
          />
          <p className="field-help">
            Copy the confirmation button’s link from your Atlas account email
            and paste it here. This also works if its redirect hasn’t been
            configured yet.
          </p>
        </>
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
