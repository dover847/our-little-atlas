import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic="force-dynamic";
export default async function FullAtlas() {
  const client=await createClient();
  const {data:{user}}=await client.auth.getUser();
  if(!user)redirect("/sign-in");
  const {data:space}=await client.from("space_memberships")
    .select("space_id").eq("user_id",user.id).limit(1).maybeSingle();
  if(!space)redirect("/space");
  return (
    <div className="atlas-classic-shell">
      <nav className="atlas-classic-bar" aria-label="Our Little Atlas navigation">
        <span>✧ Our Little Atlas</span>
        <Link href={`/space/${space.space_id}`}>Shared writing & notifications →</Link>
      </nav>
      <iframe
        src="/classic/index.html"
        title="Our Little Atlas — complete shared experience"
        className="atlas-classic-frame"
        loading="eager"
        referrerPolicy="same-origin"
      />
    </div>
  );
}
