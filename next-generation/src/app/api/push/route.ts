import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { permittedPushEndpoint } from "@/lib/notifications";

export const runtime = "nodejs";
const noStore = { "Cache-Control": "private, no-store" };

async function currentUser() {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  return { client, user: !error && user?.email_confirmed_at ? user : null };
}

export async function POST(request: NextRequest) {
  const { client, user } = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401, headers: noStore });
  if (Number(request.headers.get("content-length") || 0) > 6000)
    return NextResponse.json({ error: "Invalid subscription." }, { status: 400 });
  let subscription: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  try { subscription = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid subscription." }, { status: 400 });
  }
  const endpoint = subscription?.endpoint;
  const p256dh = subscription?.keys?.p256dh;
  const auth = subscription?.keys?.auth;
  if (typeof endpoint !== "string" || endpoint.length > 2048 ||
      !permittedPushEndpoint(endpoint) ||
      typeof p256dh !== "string" || !/^[A-Za-z0-9_-]{80,150}$/.test(p256dh) ||
      typeof auth !== "string" || !/^[A-Za-z0-9_-]{12,120}$/.test(auth))
    return NextResponse.json({ error: "This device subscription is unavailable." }, { status: 400, headers: noStore });
  const { data: existing } = await client.from("push_subscriptions")
    .select("id").eq("endpoint", endpoint).eq("user_id", user.id).maybeSingle();
  if (!existing) {
    const { count } = await client.from("push_subscriptions")
      .select("id", { count: "exact", head: true }).eq("user_id", user.id);
    if ((count ?? 0) >= 8)
      return NextResponse.json({ error: "Too many devices. Remove an old subscription first." }, { status: 400, headers: noStore });
  }
  const query = existing
    ? client.from("push_subscriptions").update({ p256dh, auth_key: auth }).eq("id", existing.id).eq("user_id", user.id)
    : client.from("push_subscriptions").insert({ user_id: user.id, endpoint, p256dh, auth_key: auth });
  const { error } = await query;
  if (error) return NextResponse.json({ error: "Could not enable notifications." }, { status: 400, headers: noStore });
  return NextResponse.json({ ok: true }, { headers: noStore });
}

export async function DELETE(request: NextRequest) {
  const { client, user } = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401, headers: noStore });
  const body = await request.json().catch(() => ({})) as { endpoint?: unknown };
  if (typeof body.endpoint !== "string" || body.endpoint.length > 2048)
    return NextResponse.json({ error: "Invalid device." }, { status: 400, headers: noStore });
  const { error } = await client.from("push_subscriptions")
    .delete().eq("endpoint", body.endpoint).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "Could not disable notifications." }, { status: 400, headers: noStore });
  return NextResponse.json({ ok: true }, { headers: noStore });
}
