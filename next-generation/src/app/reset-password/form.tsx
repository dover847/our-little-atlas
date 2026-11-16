"use client";

import { useActionState, useEffect, useState } from "react";
import { resetOwnerPassword } from "./actions";

export function PasswordResetForm() {
  const [token, setToken] = useState("");
  const [visible, setVisible] = useState(false);
  const [result, action, pending] = useActionState(resetOwnerPassword, {error:""});

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const bearer = fragment.get("token") || "";
    if (/^[A-Za-z0-9_-]{43}$/.test(bearer)) setToken(bearer);
    if (window.location.hash)
      window.history.replaceState(null, "", window.location.pathname);
  }, []);

  return (
    <form className="studio-form" action={action}>
      <input type="hidden" name="token" value={token}/>
      {!token ? (
        <p role="alert" className="auth-error">
          Your private reset link is missing. Open the complete link that was issued for you.
        </p>
      ) : (
        <p role="status" className="field-help">
          Your personal reset link is ready. Choose a password of at least 12 characters.
        </p>
      )}
      <label htmlFor="owner-new-password">New Atlas password</label>
      <input id="owner-new-password" name="password"
        type={visible ? "text" : "password"}
        minLength={12} maxLength={128}
        autoComplete="new-password"
        required disabled={!token}/>
      <label htmlFor="owner-repeat-password">Confirm new password</label>
      <input id="owner-repeat-password" name="confirmation"
        type={visible ? "text" : "password"}
        minLength={12} maxLength={128}
        autoComplete="new-password"
        required disabled={!token}/>
      <label className="field-help" style={{display:"flex",alignItems:"center",gap:8}}>
        <input type="checkbox" checked={visible}
          onChange={(checked) => setVisible(checked.target.checked)}/>
        Show password
      </label>
      {result.error && <p role="alert" className="auth-error">{result.error}</p>}
      <button className="button-dark" type="submit" disabled={!token || pending}>
        {pending ? "Saving your new password…" : "Save password & enter Atlas"}
      </button>
      <p className="field-help">
        This link works once and expires automatically. Keep your password private.
      </p>
    </form>
  );
}
