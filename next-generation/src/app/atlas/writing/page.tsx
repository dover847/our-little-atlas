import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, BookOpen, Compass, Feather, Heart, Map, Orbit, Palette, Settings2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { WritingStudio } from "@/components/writing-studio";
import { ActivityAndNotifications, type AtlasEvent } from "@/components/activity-notifications";
import { SharedThemeSync } from "@/components/shared-theme-sync";
import { PresencePulse } from "@/components/presence-pulse";
import { InvitationForm } from "@/app/space/forms";
import { revokeInvitation } from "@/app/space/actions";
import type { Writing, WritingRevision } from "@/lib/writing";
import "../modern-atlas.css";
import "./writing.css";

export const dynamic="force-dynamic";
export default async function AtlasWriting(){
 const client=await createClient();
 const {data:{user}}=await client.auth.getUser();
 if(!user)redirect("/sign-in");
 const {data:membership,error:membershipError}=await client
  .from("space_memberships").select("space_id,role").eq("user_id",user.id).limit(1).maybeSingle();
 if(membershipError||!membership)redirect("/space");
 const spaceId=membership.space_id as string;
 const [writing,events,classic,memberNames,invitations]=await Promise.all([
  client.from("writing_entries").select("id,space_id,author_id,title,body,kind,visibility,version,created_at,updated_at").eq("space_id",spaceId).order("created_at",{ascending:false}).limit(100),
  client.from("space_activity").select("id,actor_id,action,created_at").eq("space_id",spaceId).order("created_at",{ascending:false}).limit(40),
  client.from("atlas_legacy_activity").select("id,actor_id,category,created_at").eq("space_id",spaceId).order("created_at",{ascending:false}).limit(40),
  client.from("space_member_names").select("user_id,display_name").eq("space_id",spaceId),
  membership.role==="owner"?client.from("space_invitations").select("id,recipient_email,expires_at,accepted_at,revoked_at").eq("space_id",spaceId).order("created_at",{ascending:false}).limit(20):Promise.resolve({data:[],error:null}),
 ]);
 if(writing.error||events.error||classic.error||memberNames.error||invitations.error)throw Error("Our writing space is temporarily unavailable.");
 const nameOf=new Map((memberNames.data||[]).map(n=>[n.user_id,n.display_name]));
 const combined:AtlasEvent[]=[
  ...(events.data||[]).map(x=>({
   id:x.id,actorId:x.actor_id,actorName:nameOf.get(x.actor_id)||"Your companion",
   action:x.action as AtlasEvent["action"],createdAt:x.created_at,
  })),
  ...(classic.data||[]).map(x=>({
   id:x.id,actorId:x.actor_id,actorName:nameOf.get(x.actor_id)||"Your companion",
   action:"updated" as const,category:x.category,createdAt:x.created_at,
  })),
 ].sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)).slice(0,40);
 const ownIds=(writing.data||[]).filter(x=>x.author_id===user.id).map(x=>x.id);
 const revisions=ownIds.length?await client.from("writing_revisions")
  .select("entry_id,title,body,kind,visibility,version,recorded_at")
  .in("entry_id",ownIds).eq("author_id",user.id)
  .order("recorded_at",{ascending:false}).limit(200):
  {data:[],error:null};
 if(revisions.error)throw Error("Earlier writing revisions are temporarily unavailable.");
 return <div className="atlas-modern-app atlas-writing-page">
  <SharedThemeSync/><PresencePulse spaceId={spaceId} quiet/>
  <header className="atlas-modern-header">
   <Link href="/atlas?tab=journal" className="atlas-modern-back" aria-label="Return to our journal"><BookOpen size={20}/></Link>
   <div className="atlas-modern-brand"><strong>Our Little Atlas ✧</strong><small>OUR SHARED WRITING</small></div>
   <div className="atlas-modern-header-tools"><Link href="#activity" aria-label="Activity and notifications"><Bell size={19}/></Link><Link href="/appearance" aria-label="Appearance"><Settings2 size={19}/></Link></div>
  </header>
  <div className="atlas-modern-hero"><div className="atlas-modern-overline"><Feather size={14}/> OUR SHARED WRITING</div>
   <h1>Our writing studio <span>♡</span></h1><p>Private pages, shared thoughts, and the small things worth keeping.</p>
  </div>
  <nav className="atlas-modern-tabs" aria-label="Writing navigation">
   <Link href="/atlas?tab=journal"><BookOpen size={17}/>Journal</Link>
   <Link href="/atlas?tab=library"><Compass size={17}/>Our Notes</Link>
   <Link href="/atlas?tab=memories"><Heart size={17}/>Memories</Link>
   <Link href="/atlas/writing" className="selected"><Feather size={17}/>Shared Writing</Link>
   <Link href="/appearance"><Palette size={17}/>Appearance</Link>
  </nav>
  <main className="atlas-modern-main atlas-writing-body">
   <section className="atlas-feature-panel">
    <WritingStudio spaceId={spaceId} userId={user.id} entries={writing.data as Writing[]}
     revisions={revisions.data as WritingRevision[]}/>
   </section>
   {writing.data?.length===100&&<p className="atlas-empty">Showing the latest 100 visible pages. Older pages remain stored.</p>}
   <section id="activity" className="atlas-feature-panel atlas-writing-activity">
    <div className="atlas-feature-heading"><Bell/><div><h2>Our recent activity</h2><p>Changes, shared pages, and device notifications.</p></div></div>
    <ActivityAndNotifications spaceId={spaceId} userId={user.id} initialEvents={combined}/>
   </section>
   {membership.role==="owner"&&<details className="atlas-feature-panel atlas-writing-invitations">
    <summary>Invite someone into our private space</summary>
    <div className="atlas-writing-invite"><InvitationForm spaceId={spaceId}/>
    <div className="atlas-invitation-list">{(invitations.data||[]).map(invite=><div className="atlas-invitation-row" key={invite.id}>
     <div><strong>{invite.recipient_email}</strong><small>{invite.accepted_at?"Accepted":invite.revoked_at?"Revoked":"Expires "+new Date(invite.expires_at).toLocaleDateString()}</small></div>
     {!invite.accepted_at&&!invite.revoked_at&&<form action={revokeInvitation}>
      <input type="hidden" name="id" value={invite.id}/><input type="hidden" name="spaceId" value={spaceId}/><button type="submit">Revoke</button>
     </form>}
    </div>)}</div></div>
   </details>}
   <div className="atlas-modern-footnote">Our shared pages are yours to write, revise and revisit.</div>
  </main>
  <nav className="atlas-modern-bottom" aria-label="App navigation">
   <Link href="/home"><Map size={19}/>Home</Link>
   <Link href="/wheel"><Orbit size={19}/>Wheel</Link>
   <Link href="/atlas"><Compass size={19}/>Atlas</Link>
   <Link href="/atlas/writing" className="selected"><Feather size={19}/>Writing</Link>
   <Link href="/appearance"><Palette size={19}/>Settings</Link>
  </nav>
 </div>;
}
