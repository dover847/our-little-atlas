import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { displayedLegacy, updateLegacy, type AtlasPerson, type LegacyArchive } from "@/lib/legacy-reducer";
import { notifyCompanions } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";

const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const reply = (payload: Record<string,unknown>, status=200) =>
  NextResponse.json(payload,{status,headers});
function createPrivateArchiveReader() {
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error("Original Atlas archive server configuration is missing");
  // Never import a private archive with a user-scoped Supabase client:
  // table SELECT is intentionally denied to browsers to keep capsules sealed.
  return createAdminClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}

const actionNames = new Set([
  "spin","note","favorite","topic","idea","journal","journal-comment","assumption","clarity",
  "clarity-reply","mirror","mirror-answer","capsule","weather",
]);

async function context() {
  const client = await createClient();
  const {data:{user},error} = await client.auth.getUser();
  if (error || !user || !user.email_confirmed_at) return null;
  const {data:membership,error:membershipError} = await client
    .from("space_memberships").select("space_id,role")
    .eq("user_id",user.id).limit(1).maybeSingle();
  if (membershipError || !membership) return null;
  const who: AtlasPerson = membership.role==="owner" ? "Danny" : "Mia";
  return {client,user,spaceId:membership.space_id as string,who};
}

export async function GET(
  _request: NextRequest,
  {params}: {params:Promise<{action:string}>},
) {
  if ((await params).action!=="state") return reply({error:"Not found"},404);
  const auth=await context();
  if (!auth) return reply({error:"Please sign in to Atlas"},401);
  const {data,error} = await createPrivateArchiveReader()
    .from("atlas_legacy_state").select("state,revision")
    .eq("space_id",auth.spaceId).maybeSingle();
  if (error) return reply({error:"Atlas features are temporarily unavailable"},503);
  if (!data) return reply({error:"Your original Atlas data is being prepared."},503);
  const visible = displayedLegacy(data.state as LegacyArchive,auth.who);
  // Photos belonging to sealed capsules cannot receive a signed URL.
  const opened = (visible.capsules||[]).filter(
    (capsule: Record<string,unknown>) => !capsule.sealed &&
      typeof capsule.photoPath==="string" &&
      String(capsule.photoPath).startsWith(`spaces/${auth.spaceId}/capsules/`)
  );
  if(opened.length){
    const paths=opened.map((capsule: Record<string,unknown>)=>String(capsule.photoPath));
    const {data:urls,error:photosError} = await createPrivateArchiveReader()
      .storage.from("atlas-shared-media").createSignedUrls(paths,3600);
    if(!photosError && urls){
      opened.forEach((capsule: Record<string,unknown>,i:number)=>{
        capsule.photo=urls[i]?.signedUrl||"";
      });
    }
  }
  // Do not expose internal storage paths, even for already-opened capsules.
  for(const capsule of visible.capsules||[])delete capsule.photoPath;
  return reply(visible);
}

export async function POST(
  request: NextRequest,
  {params}: {params:Promise<{action:string}>},
) {
  const {action}=await params;
  if (!actionNames.has(action)) return reply({error:"Not found"},404);
  if (request.headers.get("origin") &&
      request.headers.get("origin")!==request.nextUrl.origin)
    return reply({error:"Not allowed"},403);
  const auth=await context();
  if (!auth) return reply({error:"Please sign in to Atlas"},401);
  if (Number(request.headers.get("content-length")||0)>350000)
    return reply({error:"Your entry is too large"},413);
  let body:Record<string,unknown>;
  try {
    const json=await request.json();
    if (!json || typeof json!=="object" || Array.isArray(json))
      return reply({error:"Invalid form"},400);
    body=json as Record<string,unknown>;
    if (JSON.stringify(body).length>350000)return reply({error:"Your entry is too large"},413);
  } catch {return reply({error:"Invalid form"},400);}

  for(let attempt=0;attempt<4;attempt++){
    const {data,error}=await createPrivateArchiveReader().from("atlas_legacy_state")
      .select("state,revision").eq("space_id",auth.spaceId).maybeSingle();
    if(error||!data) return reply({error:"Original Atlas data is unavailable"},503);
    let change:ReturnType<typeof updateLegacy>;
    try {
      change=updateLegacy(data.state as LegacyArchive,action,body,auth.who);
    } catch(e) {
      return reply({error:e instanceof Error?e.message:"Invalid action"},400);
    }
    let uploadedCapsulePath:string|null=null;
    if(action==="capsule" && change.state.capsules?.[0]?.photo){
      const capsule=change.state.capsules[0];
      const match=/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(capsule.photo);
      if(!match)return reply({error:"This capsule photo format is invalid"},400);
      const bytes=Buffer.from(match[2],"base64");
      if(bytes.length<12||bytes.length>135000)
        return reply({error:"This capsule photo exceeds the storage limit"},413);
      const ext=match[1]==="jpeg"?"jpg":match[1];
      uploadedCapsulePath=`spaces/${auth.spaceId}/capsules/${randomUUID()}.${ext}`;
      const {error:uploadError}=await createPrivateArchiveReader()
        .storage.from("atlas-shared-media").upload(uploadedCapsulePath,bytes,{
          contentType:`image/${match[1]}`,upsert:false,cacheControl:"3600",
        });
      if(uploadError)return reply({error:"Could not safely store that capsule photo"},503);
      // The archive holds a reference, never a large base64 photo.
      capsule.photo="";
      capsule.photoPath=uploadedCapsulePath;
    }
    // Version-gated update and activity record are one database transaction.
    const {data:saved,error:saveError}=await auth.client.rpc("atlas_update_legacy",{
      target_space:auth.spaceId,
      old_revision:data.revision,
      new_state:change.state,
      category:change.category,
    });
    if(saveError||!saved){
      if(uploadedCapsulePath)
        await createPrivateArchiveReader().storage.from("atlas-shared-media")
          .remove([uploadedCapsulePath]);
      if(saveError)return reply({error:"Could not save that change right now"},503);
      continue;
    }
    // A push failure must never undo a saved entry.
    try {
      await notifyCompanions(auth.spaceId,auth.user.id,"updated",change.category);
    } catch {console.warn("A classic Atlas change was saved without push delivery");}
    return reply({...change.result,revision:change.state.revision});
  }
  return reply({error:"The Atlas changed while you were editing. Please try again."},409);
}
