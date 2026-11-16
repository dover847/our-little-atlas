import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { displayedLegacy, updateLegacy, type AtlasPerson, type LegacyArchive } from "@/lib/legacy-reducer";
import { notifyCompanions } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  return reply(displayedLegacy(data.state as LegacyArchive,auth.who));
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
    // Version-gated update and activity record are one database transaction.
    const {data:saved,error:saveError}=await auth.client.rpc("atlas_update_legacy",{
      target_space:auth.spaceId,
      old_revision:data.revision,
      new_state:change.state,
      category:change.category,
    });
    if(saveError) return reply({error:"Could not save that change right now"},503);
    if(!saved)continue;
    // A push failure must never undo a saved entry.
    try {
      await notifyCompanions(auth.spaceId,auth.user.id,"updated",change.category);
    } catch {console.warn("A classic Atlas change was saved without push delivery");}
    return reply({...change.result,revision:change.state.revision});
  }
  return reply({error:"The Atlas changed while you were editing. Please try again."},409);
}
