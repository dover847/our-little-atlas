import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { SignInForm } from "./form";

export default function SignIn() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">
          <LockKeyhole
            size={16}
            style={{ display: "inline", marginRight: 8 }}
          />
          YOUR OWN LITTLE PLACE
        </p>
        <h1>
          A familiar place.
          <br />
          <em>A door of your own.</em>
        </h1>
        <p>
          Sign in with your individual preview account. The shared password for
          your original atlas does not apply here.
        </p>
        <SignInForm />
        <p>
          This preview is invite-only. Your existing memories remain in the original atlas.
        </p>
        <Link href="/activate" className="auth-back">Activate an emailed account invitation →</Link><br/>
        <Link href="/" className="auth-back">
          <ArrowLeft size={14} />
          Back to exploring
        </Link>
      </section>
    </main>
  );
}
