import Link from "next/link";
import { ActivateForm, FreshAccessForm } from "./form";
export default function Activate() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">YOUR OWN KEY TO THE ATLAS</p>
        <h1>
          A little door.
          <br />
          <em>Only your key.</em>
        </h1>
        <p>
          Activate your individual account and choose a password. The original
          Atlas shared password is separate.
        </p>
        <ActivateForm />
        <FreshAccessForm />
        <Link className="auth-back" href="/sign-in">
          Already set up? Sign in →
        </Link>
      </section>
    </main>
  );
}
