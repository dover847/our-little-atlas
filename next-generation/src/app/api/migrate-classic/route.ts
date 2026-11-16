import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options":"nosniff" };
function response(data:Record<string,unknown>, status=200) {
  return NextResponse.json(data,{status,headers});
}

// Temporary, one-use archive copy. Source material stays on the existing
// Render disk. Its contents must never be logged, returned, or exposed to users.
export async function POST(req:NextRequest) {
  const secret=process.env.ATLAS_COPY_EXPORT_KEY;
  const given=req.headers.get("x-atlas-copy-key")||"";
  if (!secret || secret.length<40 || given.length!==secret.length ||
      !timingSafeEqual(Buffer.from(given),Buffer.from(secret)))
    return response({error:"Not found"},404);

  const source="https://anamora.onrender.com/api/_owner_atlas_backup";
  const dbUrl=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const adminKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!dbUrl||!adminKey)return response({error:"Server configuration unavailable"},503);
  const db=createClient(dbUrl,adminKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:spaces,error:spaceError}=await db.from("spaces").select("id,owner_id").limit(3);
  if(spaceError||!spaces||spaces.length!==1)return response({error:"Unique destination unavailable"},409);
  const space=spaces[0];
  const {data:owner,error:ownerError}=await db.auth.admin.getUserById(space.owner_id);
  if(ownerError||owner.user?.email!=="dover847@gmail.com")
    return response({error:"Destination owner mismatch"},409);

  const {data:existing,error:existingError}=await db.from("atlas_legacy_state")
    .select("revision,imported_at,source_sha256")
    .eq("space_id",space.id).maybeSingle();
  if(existingError)return response({error:"Cannot verify destination"},503);
  if(existing)return response({ok:true,alreadyImported:true,revision:existing.revision},200);

  let archive:Record<string,unknown>;
  let sha:string;
  try {
    const fetched=await fetch(source,{
      method:"GET",
      headers:{"x-atlas-copy-key":secret},
      redirect:"error",
      cache:"no-store",
      signal:AbortSignal.timeout(25000),
    });
    if(fetched.status!==200)return response({error:"Original Atlas export unavailable",status:fetched.status},502);
    const bytes=Buffer.from(await fetched.arrayBuffer());
    if(bytes.length===0||bytes.length>16000000)return response({error:"Unexpected archive size"},413);
    sha=createHash("sha256").update(bytes).digest("hex");
    archive=JSON.parse(bytes.toString("utf8")) as Record<string,unknown>;
  } catch {
    return response({error:"Could not obtain original archive"},502);
  }
  const arrays=["spins","favorites","ideas","journal","customActivities",
    "capsules","mirrors","clarity","assumptions"];
  if(!archive||typeof archive!=="object"||Array.isArray(archive))
    return response({error:"Original archive failed structural verification"},422);
  // The original disk was created before several newer features existed.
  // Missing fields are truly empty; never discard or coerce existing entries.
  for(const field of arrays) if(!(field in archive))archive[field]=[];
  for(const field of ["notes","weather"])if(!(field in archive))archive[field]={};
  if(!Number.isSafeInteger(archive.revision)||Number(archive.revision)<0 ||
    arrays.some(k=>!Array.isArray(archive[k])) ||
    !archive.notes||typeof archive.notes!=="object"||Array.isArray(archive.notes)||
    !archive.weather||typeof archive.weather!=="object"||Array.isArray(archive.weather))
    return response({error:"Original archive failed structural verification"},422);
  const {error:insertError}=await db.from("atlas_legacy_state").insert({
    space_id:space.id,
    state:archive,
    revision:archive.revision,
    source_sha256:sha,
    imported_at:new Date().toISOString(),
  });
  if(insertError){
    if(insertError.code==="23505")return response({ok:true,alreadyImported:true});
    return response({error:"Archive could not be inserted"},503);
  }
  const {data:confirmed,error:confirmError}=await db.from("atlas_legacy_state")
    .select("revision,source_sha256").eq("space_id",space.id).single();
  if(confirmError||confirmed?.source_sha256!==sha||
    confirmed.revision!==archive.revision)
    return response({error:"Import verification failed"},503);
  return response({
    ok:true,imported:true,
    revision:confirmed.revision,
    sourceHash:sha,
    counts:Object.fromEntries(arrays.map(key=>[key,(archive[key] as unknown[]).length])),
    noteRecords:Object.keys(archive.notes).length,
    weatherRecords:Object.keys(archive.weather).length,
  });
}
