import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export const dynamic="force-dynamic";
export default async function Home(){
 const client=await createClient();
 const {data:{user}}=await client.auth.getUser();
 if(!user)redirect("/sign-in");
 const {data:member}=await client.from("space_memberships").select("space_id").eq("user_id",user.id).limit(1).maybeSingle();
 if(member)redirect("/home");
 redirect("/space");
}
