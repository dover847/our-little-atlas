import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/sign-in/actions";

export const dynamic = "force-dynamic";
export default async function Space() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  const { data: spaces, error } = await supabase
    .from("spaces")
    .select("id, name");
  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">YOUR PRIVATE SPACES</p>
        <h1>
          Room for
          <br />
          <em>something lovely.</em>
        </h1>
        {error ? (
          <p role="alert">
            Your spaces couldn’t be loaded. Please try again later.
          </p>
        ) : spaces?.length ? (
          <ul>
            {spaces.map((space) => (
              <li key={space.id}>{space.name}</li>
            ))}
          </ul>
        ) : (
          <p>
            You’re signed in. There are no shared spaces linked to this account
            yet. Invitations are the next chapter; nothing from your original
            atlas has been imported.
          </p>
        )}
        <Link href="/" className="auth-back">
          Explore the activity atlas →
        </Link>
        <form action={signOut}>
          <button className="button-dark">Sign out</button>
        </form>
      </section>
    </main>
  );
}
