import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, LockKeyhole, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/sign-in/actions";
import { revokeInvitation } from "../actions";
import { InvitationForm } from "../forms";
import { WritingStudio } from "@/components/writing-studio";
import { uuidPattern, type Writing, type WritingRevision } from "@/lib/writing";

export const dynamic = "force-dynamic";
export default async function SharedSpace({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect("/sign-in");
  const { data: space, error: spaceError } = await client
    .from("spaces")
    .select("id,name,owner_id")
    .eq("id", id)
    .maybeSingle();
  if (spaceError) throw new Error("Your space is temporarily unavailable.");
  if (!space) notFound();
  const owner = space.owner_id === user.id;
  const [writing, invitations] = await Promise.all([
    client
      .from("writing_entries")
      .select(
        "id,space_id,author_id,title,body,kind,visibility,version,created_at,updated_at",
      )
      .eq("space_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
    owner
      ? client
          .from("space_invitations")
          .select(
            "id,recipient_email,created_at,expires_at,accepted_at,revoked_at",
          )
          .eq("space_id", id)
          .order("created_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (writing.error || invitations.error)
    throw new Error("Your pages are temporarily unavailable.");
  const ownIds = (writing.data || [])
    .filter((entry) => entry.author_id === user.id)
    .map((entry) => entry.id);
  const revisions = ownIds.length
    ? await client
        .from("writing_revisions")
        .select("entry_id,title,body,kind,visibility,version,recorded_at")
        .in("entry_id", ownIds)
        .eq("author_id", user.id)
        .order("recorded_at", { ascending: false })
        .limit(200)
    : { data: [], error: null };
  if (revisions.error)
    throw new Error("Earlier versions are temporarily unavailable.");
  return (
    <div className="private-world">
      <header className="private-header">
        <Link href="/space" className="private-brand">
          ✳ <span>our little atlas.</span>
        </Link>
        <div>
          <Link href="/">Explore activities</Link>
          <form action={signOut}>
            <button>Sign out</button>
          </form>
        </div>
      </header>
      <main className="private-main">
        <Link href="/space" className="auth-back">
          <ArrowLeft size={14} />
          All my spaces
        </Link>
        <section className="private-hero">
          <div>
            <p className="eyebrow">
              <LockKeyhole size={13} /> A WORLD OF YOUR OWN
            </p>
            <h1>{space.name}</h1>
            <p>
              A little room for your own thoughts. A little space for
              understanding together.
            </p>
          </div>
          <Sparkles size={58} strokeWidth={0.6} />
        </section>
        <WritingStudio
          spaceId={id}
          userId={user.id}
          entries={writing.data as Writing[]}
          revisions={revisions.data as WritingRevision[]}
        />
        {writing.data?.length === 100 && (
          <p className="field-help">
            Showing the latest 100 visible pages. Older pages remain stored;
            browsing them is planned.
          </p>
        )}
        {owner && (
          <section className="invite-section">
            <div>
              <p className="eyebrow">AN OPEN DOOR, CAREFULLY KEPT</p>
              <h2>
                Invite someone
                <br />
                <em>into your world.</em>
              </h2>
              <p>
                Their account stays their own. Private writing stays private.
              </p>
            </div>
            <div>
              <InvitationForm spaceId={id} />
              <h3 className="pending-title">Recent invitations</h3>
              {invitations.data?.length ? (
                <ul className="invitation-list">
                  {invitations.data.map((invite) => (
                    <li key={invite.id}>
                      <div>
                        <span>{invite.recipient_email}</span>
                        <small>
                          {invite.accepted_at
                            ? "Accepted"
                            : invite.revoked_at
                              ? "Revoked"
                              : new Date(invite.expires_at).getTime() <=
                                  Date.now()
                                ? "Expired"
                                : `Expires ${new Date(invite.expires_at).toLocaleDateString("en", { timeZone: "UTC" })}`}
                        </small>
                      </div>
                      {!invite.accepted_at && !invite.revoked_at && (
                        <form action={revokeInvitation}>
                          <input type="hidden" name="id" value={invite.id} />
                          <input type="hidden" name="spaceId" value={id} />
                          <button className="text-button">Revoke</button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="field-help">
                  No invitations yet. There’s no hurry.
                </p>
              )}
            </div>
          </section>
        )}
        <footer className="footer">
          <span>our little atlas.</span>
          <span>YOUR WORDS, AT YOUR OWN PACE</span>
        </footer>
      </main>
    </div>
  );
}
