import { NextRequest, NextResponse, after } from "next/server";
import { notifyCompanions } from "@/lib/notifications";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createClient as adminClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const bucket = "atlas-shared-media";
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const reply = (value:Record<string,unknown>,status=200)=>NextResponse.json(value,{status,headers});

async function context(){
 const client=await createClient();
 const {data:{user},error}=await client.auth.getUser();
 if(error||!user?.email_confirmed_at)return null;
 const {data:member,error:membershipError}=await client.from("space_memberships")
   .select("space_id,role").eq("user_id",user.id).limit(1).maybeSingle();
 if(membershipError||!member)return null;
 return { client, userId:user.id, spaceId:member.space_id as string };
}
function admin(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw Error("Private Atlas profile storage is unavailable");
 return adminClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
function announceChange(spaceId:string,userId:string){
 after(async()=>{
  try{
   await admin().from("atlas_legacy_activity").insert({space_id:spaceId,actor_id:userId,category:"our shared portraits"});
   await notifyCompanions(spaceId,userId,"updated","our shared portraits");
  }catch{console.warn("A portrait was saved without push notification");}
 });
}
function sameOrigin(request:NextRequest){
 const origin=request.headers.get("origin");
 return !origin||origin===request.nextUrl.origin;
}
function validImage(bytes:Buffer,mime:string){
 if(mime==="image/jpeg")return bytes.length>100&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 if(mime==="image/png")return bytes.subarray(0,8).equals(Buffer.from("89504e470d0a1a0a","hex"));
 if(mime==="image/webp")return bytes.subarray(0,4).toString()==="RIFF"&&bytes.subarray(8,12).toString()==="WEBP";
 return false;
}
export async function GET(){
 const ctx=await context();if(!ctx)return reply({error:"Please sign in to Atlas"},401);
 const [members,photos]=await Promise.all([
  ctx.client.from("space_memberships").select("user_id,role").eq("space_id",ctx.spaceId),
  ctx.client.from("atlas_profile_photos").select("user_id,photo_path,updated_at").eq("space_id",ctx.spaceId),
 ]);
 if(members.error||photos.error)return reply({error:"Our profile photos are temporarily unavailable"},503);
 const {data:names}=await ctx.client.from("space_member_names")
  .select("user_id,display_name").eq("space_id",ctx.spaceId);
 const db=admin();const found=photos.data||[];
 const signed=found.length?await db.storage.from(bucket)
  .createSignedUrls(found.map(p=>p.photo_path),3600):null;
 const profiles=(members.data||[]).sort((a,b)=>a.role==="owner"?-1:b.role==="owner"?1:0)
  .map(m=>{
   const index=found.findIndex(p=>p.user_id===m.user_id);
   return {
    userId:m.user_id,
    name:names?.find(n=>n.user_id===m.user_id)?.display_name || (m.role==="owner"?"Danny":"Mia"),
    role:m.role,
    isMe:m.user_id===ctx.userId,
    photoUrl:index>=0?(signed?.data?.[index]?.signedUrl||null):null,
    updatedAt:index>=0?found[index].updated_at:null,
   };
  });
 return reply({profiles});
}
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return reply({error:"Request origin not allowed"},403);
 const ctx=await context();if(!ctx)return reply({error:"Please sign in to Atlas"},401);
 if(Number(request.headers.get("content-length")||0)>1500000)return reply({error:"Please choose a smaller portrait"},413);
 const form=await request.formData().catch(()=>null);
 const photo=form?.get("photo");
 if(!(photo instanceof File)||photo.size>1200000||photo.size<100||
  !["image/jpeg","image/png","image/webp"].includes(photo.type))
   return reply({error:"Choose a JPG, PNG or WebP portrait under 1.2 MB"},400);
 const bytes=Buffer.from(await photo.arrayBuffer());
 if(!validImage(bytes,photo.type))return reply({error:"This image format is invalid"},400);
 const ext=photo.type==="image/jpeg"?"jpg":photo.type==="image/png"?"png":"webp";
 const path=`spaces/${ctx.spaceId}/profiles/${ctx.userId}/${randomUUID()}.${ext}`;
 const db=admin();
 const {data:existing,error:lookupError}=await db.from("atlas_profile_photos")
  .select("photo_path").eq("space_id",ctx.spaceId).eq("user_id",ctx.userId).maybeSingle();
 if(lookupError)return reply({error:"Could not check existing portrait"},503);
 const uploaded=await db.storage.from(bucket).upload(path,bytes,{
  contentType:photo.type,cacheControl:"3600",upsert:false,
 });
 if(uploaded.error)return reply({error:"Could not store the portrait privately"},503);
 const saved=await db.from("atlas_profile_photos").upsert({
  space_id:ctx.spaceId,user_id:ctx.userId,photo_path:path,updated_at:new Date().toISOString()
 },{onConflict:"space_id,user_id"});
 if(saved.error){
  await db.storage.from(bucket).remove([path]);
  return reply({error:"Could not save your portrait"},503);
 }
 if(existing?.photo_path&&existing.photo_path!==path)
  await db.storage.from(bucket).remove([existing.photo_path]);
 announceChange(ctx.spaceId,ctx.userId);
 return reply({ok:true});
}
export async function DELETE(request:NextRequest){
 if(!sameOrigin(request))return reply({error:"Request origin not allowed"},403);
 const ctx=await context();if(!ctx)return reply({error:"Please sign in to Atlas"},401);
 const db=admin();
 const {data:existing,error:readError}=await db.from("atlas_profile_photos")
  .select("photo_path").eq("space_id",ctx.spaceId).eq("user_id",ctx.userId).maybeSingle();
 if(readError)return reply({error:"Could not access your portrait"},503);
 const {error}=await db.from("atlas_profile_photos").delete()
  .eq("space_id",ctx.spaceId).eq("user_id",ctx.userId);
 if(error)return reply({error:"Could not remove your portrait"},503);
 if(existing?.photo_path)await db.storage.from(bucket).remove([existing.photo_path]);
 announceChange(ctx.spaceId,ctx.userId);
 return reply({ok:true});
}
