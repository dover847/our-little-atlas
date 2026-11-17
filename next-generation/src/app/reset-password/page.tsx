import Link from "next/link";
import { PasswordResetForm } from "./form";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Create a new password · Our Little Atlas",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">OUR LITTLE ATLAS · OWNER ACCOUNT</p>
        <h1>
          A new key.
          <br />
          <em>The same little world.</em>
        </h1>
        <p>
          Choose a new password for your Atlas account. Your shared space,
          existing memories, and Mia&apos;s account will stay just as they are.
        </p>
        <PasswordResetForm />
        <Link className="auth-back" href="/sign-in">
          Already know your password? Sign in →
        </Link>
      </section>
    </main>
  );
}
