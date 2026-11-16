import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";

const bucket = "atlas-shared-media";
const validThemes = new Set(["original","rose","forest","ocean","violet","sunrise","twilight"]);
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const respond = (data: Record<string, unknown>, status = 200) => NextResponse.json(data, { status, headers });
type Context = { spaceId: string; userId: string; client: Awaited<ReturnType<typeof createClient>> };

async function member(): Promise<Context | null> {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user?.email_confirmed_at) return null;
  const { data: membership, error: membershipError } = await client
    .from("space_memberships").select("space_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (membershipError || !membership) return null;
  return { client, spaceId: membership.space_id, userId: user.id };
}

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Server-only Atlas media configuration unavailable");
  return createAdminClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return !origin || origin === request.nextUrl.origin;
}

async function snapshot(ctx: Context) {
  const [appearance, names, usage] = await Promise.all([
    ctx.client.from("atlas_atmospheres")
      .select("shared_theme,accent_color,background_path,background_bytes,updated_at,updated_by")
      .eq("space_id",ctx.spaceId).single(),
    ctx.client.from("space_member_names").select("user_id,display_name").eq("space_id",ctx.spaceId),
    ctx.client.rpc("atlas_storage_usage",{target_space:ctx.spaceId}),
  ]);
  if (appearance.error || !appearance.data) return respond({error:"Shared appearance temporarily unavailable"},503);
  const row=appearance.data;
  let backgroundUrl: string | null=null;
  if (row.background_path) {
    const signed = await admin().storage.from(bucket)
      .createSignedUrl(row.background_path, 3600);
    if (!signed.error) backgroundUrl=signed.data.signedUrl;
  }
  const displayName = names.data?.find(n=>n.user_id===row.updated_by)?.display_name || "";
  const metrics = Array.isArray(usage.data) ? usage.data[0] : usage.data;
  return respond({
    sharedTheme:row.shared_theme,
    accentColor:row.accent_color,
    backgroundPath:row.background_path,
    backgroundUrl,
    backgroundBytes:row.background_bytes,
    updatedAt:row.updated_at,
    updatedBy:displayName,
    storage:usage.error ? null : {
      mediaFiles:Number(metrics?.file_count || 0),
      mediaBytes:Number(metrics?.file_bytes || 0),
      archiveBytes:Number(metrics?.archive_bytes || 0),
      writingPages:Number(metrics?.writing_pages || 0),
    },
  });
}

export async function GET() {
  const ctx=await member();
  return ctx ? snapshot(ctx) : respond({error:"Sign in to Atlas first"},401);
}

export async function PATCH(request: NextRequest) {
  if(!sameOrigin(request))return respond({error:"Request origin not allowed"},403);
  const ctx=await member();
  if(!ctx)return respond({error:"Sign in to Atlas first"},401);
  if(Number(request.headers.get("content-length")||0)>1200)
    return respond({error:"Invalid customization"},413);
  const input=await request.json().catch(()=>null);
  if(!input||typeof input!=="object"||Array.isArray(input))
    return respond({error:"Invalid customization"},400);
  const theme=String(input.theme ?? "");
  const accent=String(input.accent ?? "");
  const removePhoto=input.removePhoto === true;
  if(!validThemes.has(theme)||!/^#[a-fA-F0-9]{6}$/.test(accent))
    return respond({error:"Choose a supported theme and accent color"},400);
  const db=admin();
  const {data:existing,error:existingError}=await db.from("atlas_atmospheres")
    .select("background_path").eq("space_id",ctx.spaceId).single();
  if(existingError)return respond({error:"Could not read shared atmosphere"},503);
  const update: Record<string,unknown>={
    shared_theme:theme,accent_color:accent,
    updated_by:ctx.userId,updated_at:new Date().toISOString(),
  };
  if(removePhoto){update.background_path=null; update.background_bytes=0;}
  const {error}=await db.from("atlas_atmospheres").update(update).eq("space_id",ctx.spaceId);
  if(error)return respond({error:"Could not save shared atmosphere"},503);
  if(removePhoto && existing?.background_path)
    await db.storage.from(bucket).remove([existing.background_path]);
  return snapshot(ctx);
}

function validImage(bytes: Buffer, type: string) {
  if(type==="image/jpeg")return bytes.length>=4&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  if(type==="image/png")return bytes.subarray(0,8).equals(Buffer.from("89504e470d0a1a0a","hex"));
  if(type==="image/webp")return bytes.subarray(0,4).toString()==="RIFF"&&bytes.subarray(8,12).toString()==="WEBP";
  return false;
}
export async function POST(request: NextRequest) {
  if(!sameOrigin(request))return respond({error:"Request origin not allowed"},403);
  const ctx=await member();
  if(!ctx)return respond({error:"Sign in to Atlas first"},401);
  if(Number(request.headers.get("content-length")||0)>1500000)
    return respond({error:"Choose a compressed photo under 1.2 MB"},413);
  const form=await request.formData().catch(()=>null);
  const photo=form?.get("photo");
  if(!(photo instanceof File))
    return respond({error:"Choose a photo"},400);
  if(photo.size<100||photo.size>1200000||!["image/jpeg","image/png","image/webp"].includes(photo.type))
    return respond({error:"Please choose a JPG, PNG or WebP photo under 1.2 MB"},400);
  const bytes=Buffer.from(await photo.arrayBuffer());
  if(!validImage(bytes,photo.type))
    return respond({error:"The image format was not recognized"},400);
  const ext=photo.type==="image/jpeg"?"jpg":photo.type==="image/png"?"png":"webp";
  const path=`spaces/${ctx.spaceId}/background-${randomUUID()}.${ext}`;
  const db=admin();
  const {data:previous,error:readError}=await db.from("atlas_atmospheres")
    .select("background_path").eq("space_id",ctx.spaceId).single();
  if(readError)return respond({error:"Could not check existing shared photo"},503);
  const uploaded=await db.storage.from(bucket).upload(path,bytes,{
    contentType:photo.type,cacheControl:"3600",upsert:false,
  });
  if(uploaded.error)return respond({error:"Photo storage is unavailable. Please try a smaller image."},503);
  const {error:updateError}=await db.from("atlas_atmospheres").update({
    background_path:path,background_bytes:bytes.length,
    updated_by:ctx.userId,updated_at:new Date().toISOString(),
  }).eq("space_id",ctx.spaceId);
  if(updateError) {
    await db.storage.from(bucket).remove([path]);
    return respond({error:"Could not apply that background"},503);
  }
  if(previous?.background_path)
    await db.storage.from(bucket).remove([previous.background_path]);
  return snapshot(ctx);
}
