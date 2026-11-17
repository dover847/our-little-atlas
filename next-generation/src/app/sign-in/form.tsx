"use client";
import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { signIn } from "./actions";

export function SignInForm() {
  const [state, action, pending] = useActionState(signIn, { error: "" });
  return (
    <form action={action}>
      <label htmlFor="email">Your email</label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="username"
        maxLength={254}
        required
      />
      <label htmlFor="password">Your password</label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        maxLength={256}
        required
      />
      {state.error && (
        <p role="alert" className="auth-error">
          {state.error}
        </p>
      )}
      <button className="button-dark" disabled={pending} type="submit">
        {pending ? "Opening your space…" : "Enter your space"}
        <ArrowRight size={16} />
      </button>
    </form>
  );
}
