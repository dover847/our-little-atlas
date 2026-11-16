import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { uuidPattern } from "@/lib/writing";
export const dynamic="force-dynamic";
// Existing deep links now open the fully integrated writing experience.
export default async function SharedSpace({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!uuidPattern.test(id))notFound();
 const client=await createClient();
 const {data:{user}}=await client.auth.getUser();
 if(!user)redirect("/sign-in");
 const {data:membership,error}=await client.from("space_memberships")
  .select("space_id").eq("space_id",id).eq("user_id",user.id).maybeSingle();
 if(error||!membership)notFound();
 redirect("/atlas/writing");
}
