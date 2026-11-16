import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SharedWheel } from "./shared-wheel";
import "./wheel.css";

export const dynamic = "force-dynamic";
export default async function NewWheelPage(){
 const client=await createClient();
 const {data:{user}}=await client.auth.getUser();
 if(!user)redirect("/sign-in");
 const {data:membership}=await client.from("space_memberships").select("space_id").eq("user_id",user.id).limit(1).maybeSingle();
 if(!membership)redirect("/space");
 return <SharedWheel spaceId={membership.space_id as string}/>;
}
