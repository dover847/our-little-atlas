import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppearanceEditor } from "./editor";
export const dynamic = "force-dynamic";
export default async function SharedAppearancePage(){
 const client=await createClient();
 const {data:{user}}=await client.auth.getUser();
 if(!user)redirect("/sign-in");
 const {data:membership}=await client.from("space_memberships").select("space_id").eq("user_id",user.id).limit(1).maybeSingle();
 if(!membership)redirect("/space");
 return <AppearanceEditor spaceId={membership.space_id as string}/>;
}
