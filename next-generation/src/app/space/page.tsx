import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/sign-in/actions";
import { CreateSpaceForm, PendingInvitation } from "./forms";

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
  const { data: invitations, error: invitationError } = await supabase.rpc(
    "my_pending_invitations",
  );
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
              <li key={space.id}>
                <Link href={`/space/${space.id}`}>{space.name} →</Link>
              </li>
            ))}
          </ul>
        ) : (
          <p>
            You’re signed in. You can accept an invitation or, if you have
            first-owner access, create your private world. Nothing from the
            original atlas has been imported.
          </p>
        )}
        {!error && !spaces?.length && <CreateSpaceForm />}
        {invitationError ? (
          <p role="alert">
            Pending invitations couldn’t be loaded. Please try again.
          </p>
        ) : (
          invitations?.map((invitation: { id: string; space_name: string }) => (
            <PendingInvitation
              key={invitation.id}
              id={invitation.id}
              name={invitation.space_name}
            />
          ))
        )}
        <Link href="/join" className="auth-back">
          Accept a private invitation →
        </Link>
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
