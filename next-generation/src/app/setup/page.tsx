import Link from "next/link";
import { PrivateSetupForm } from "./form";

export const dynamic = "force-dynamic";

export default function PrivateAccountSetup() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">OUR LITTLE ATLAS · PRIVATE INVITATION</p>
        <h1>
          One little door.
          <br />
          <em>Your own key.</em>
        </h1>
        <p>
          Welcome to our shared world. You can choose your password right here
          and enter Atlas in one step.
        </p>
        <PrivateSetupForm />
        <Link href="/sign-in" className="auth-back">
          Already have a password? Sign in →
        </Link>
      </section>
    </main>
  );
}
