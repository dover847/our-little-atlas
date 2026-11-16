import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as adminClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";

const noCache = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const response = (data: Record<string, unknown>, status = 200) =>
  NextResponse.json(data, { status, headers: noCache });

async function getContext(request: NextRequest) {
  const spaceId = request.nextUrl.searchParams.get("spaceId") || "";
  if (!/^[a-f0-9-]{36}$/i.test(spaceId)) return null;
  const client = await createClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user?.email_confirmed_at) return null;
  const { data: membership, error: membershipError } = await client
    .from("space_memberships").select("space_id")
    .eq("space_id", spaceId).eq("user_id", user.id).maybeSingle();
  if (membershipError || !membership) return null;
  return { spaceId, userId: user.id };
}

function database() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return adminClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
async function status(spaceId: string, userId: string) {
  const db = database();
  if (!db) return response({ error: "Presence temporarily unavailable" }, 503);
  const { data, error } = await db.from("atlas_presence")
    .select("user_id,last_seen_at").eq("space_id", spaceId).limit(10);
  if (error) return response({ error: "Presence temporarily unavailable" }, 503);
  const threshold = Date.now() - 80000;
  const active = (data || []).filter(row =>
    Number.isFinite(Date.parse(row.last_seen_at)) && Date.parse(row.last_seen_at) >= threshold);
  const selfOnline = active.some(row => row.user_id === userId);
  const partnerOnline = active.some(row => row.user_id !== userId);
  return response({ selfOnline, partnerOnline, bothOnline: selfOnline && partnerOnline });
}
export async function GET(request: NextRequest) {
  const ctx = await getContext(request);
  return ctx ? status(ctx.spaceId, ctx.userId) : response({ error: "Not authorized" }, 401);
}
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") && request.headers.get("origin") !== request.nextUrl.origin)
    return response({ error: "Request origin not allowed" }, 403);
  const ctx = await getContext(request);
  if (!ctx) return response({ error: "Not authorized" }, 401);
  const db = database();
  if (!db) return response({ error: "Presence temporarily unavailable" }, 503);
  const { error } = await db.from("atlas_presence").upsert({
    space_id: ctx.spaceId,
    user_id: ctx.userId,
    last_seen_at: new Date().toISOString(),
  }, { onConflict: "space_id,user_id" });
  if (error) return response({ error: "Could not update presence" }, 503);
  return status(ctx.spaceId, ctx.userId);
}
