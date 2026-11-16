import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const spaceId = request.nextUrl.searchParams.get("space") || "";
  if (!uuid.test(spaceId))
    return NextResponse.json({ error: "Invalid space." }, { status: 400, headers });
  const client = await createClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user)
    return NextResponse.json({ error: "Sign in first." }, { status: 401, headers });
  const { data: space, error: spaceError } = await client.from("spaces")
    .select("id").eq("id", spaceId).maybeSingle();
  if (spaceError || !space)
    return NextResponse.json({ error: "Space unavailable." }, { status: 404, headers });
  const [activity, profiles] = await Promise.all([
    client.from("space_activity").select("id,actor_id,action,created_at")
      .eq("space_id", spaceId).order("created_at", { ascending: false }).limit(40),
    client.from("space_member_names").select("user_id,display_name").eq("space_id", spaceId),
  ]);
  if (activity.error || profiles.error)
    return NextResponse.json({ error: "Activity is temporarily unavailable." }, { status: 503, headers });
  const names = new Map((profiles.data || []).map(({ user_id, display_name }) => [user_id, display_name]));
  return NextResponse.json({
    events: (activity.data || []).map((a) => ({
      id: a.id,
      actorId: a.actor_id,
      actorName: names.get(a.actor_id) || "Your companion",
      action: a.action,
      createdAt: a.created_at,
    })),
  }, { headers });
}
