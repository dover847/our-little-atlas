import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ModernAtlas } from "./modern-atlas";
import "./modern-atlas.css";
export const dynamic = "force-dynamic";
const tabs=new Set(["library","journal","weather","capsules","memories","understanding","ideas","notes"]);
export default async function AtlasSectionsPage({
 searchParams,
}:{searchParams:Promise<{tab?:string;activity?:string}>}){
 const opts=await searchParams;
 const client=await createClient();
 const {data:{user}}=await client.auth.getUser();
 if(!user)redirect("/sign-in");
 const {data:member,error}=await client.from("space_memberships").select("space_id").eq("user_id",user.id).limit(1).maybeSingle();
 if(error||!member)redirect("/space");
 const tab=tabs.has(opts.tab||"")?opts.tab!:"library";
 const activityId=opts.activity&&/^\d+$/.test(opts.activity)?Number(opts.activity):null;
 return <ModernAtlas spaceId={member.space_id as string} initialTab={tab} initialActivity={activityId}/>;
}
