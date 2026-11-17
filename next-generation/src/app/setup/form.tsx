"use client";

import { useActionState, useEffect, useState } from "react";
import { setUpInvitedAccount } from "./actions";

export function PrivateSetupForm() {
  const [token, setToken] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [state, action, pending] = useActionState(setUpInvitedAccount, { error: "" });

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const value = hash.get("token") || "";
    if (/^[A-Za-z0-9_-]{43}$/.test(value)) setToken(value);
    if (window.location.hash)
      window.history.replaceState(null, "", window.location.pathname);
  }, []);

  return (
    <form action={action} className="studio-form">
      <input type="hidden" name="token" value={token} />
      {!token ? (
        <p role="status" className="auth-error">
          This page needs your personal invitation link. Please open the full private link shared with you.
        </p>
      ) : (
        <p className="field-help">
          Your invitation is ready. Choose your own password to enter your private space.
          No email confirmation or developer account is needed.
        </p>
      )}
      <label htmlFor="setup-password">Choose a password (12 characters minimum)</label>
      <input
        id="setup-password"
        name="password"
        type={revealed ? "text" : "password"}
        minLength={12}
        maxLength={128}
        autoComplete="new-password"
        required
        disabled={!token}
      />
      <label htmlFor="setup-confirmation">Confirm your password</label>
      <input
        id="setup-confirmation"
        name="confirmation"
        type={revealed ? "text" : "password"}
        minLength={12}
        maxLength={128}
        autoComplete="new-password"
        required
        disabled={!token}
      />
      <label className="field-help" style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="checkbox" checked={revealed} onChange={(event) => setRevealed(event.target.checked)} />
        Show passwords
      </label>
      {state.error && <p role="alert" className="auth-error">{state.error}</p>}
      <button className="button-dark" type="submit" disabled={!token || pending}>
        {pending ? "Opening your space…" : "Create password & enter Atlas"}
      </button>
      <p className="field-help">
        This one-use invitation grants access only to its intended account.
        Keep your invitation and password private.
      </p>
    </form>
  );
}
