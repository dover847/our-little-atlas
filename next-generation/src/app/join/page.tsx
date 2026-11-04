import Link from "next/link";
import { JoinForm } from "@/app/space/forms";
export default function Join() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">AN INVITATION, JUST FOR YOU</p>
        <h1>
          A little world.
          <br />
          <em>A place together.</em>
        </h1>
        <p>
          Accept with your verified individual account. Your private pages will
          stay yours alone.
        </p>
        <JoinForm />
        <Link className="auth-back" href="/sign-in">
          Sign in to your account →
        </Link>
        <br />
        <Link className="auth-back" href="/activate">
          Activate an emailed account invitation →
        </Link>
      </section>
    </main>
  );
}
