import "server-only";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

type SharedChange = "created" | "updated" | "shared";

export function permittedPushEndpoint(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
    const host = url.hostname.toLowerCase();
    return host === "web.push.apple.com" || host.endsWith(".push.apple.com") ||
      host === "fcm.googleapis.com" || host === "updates.push.services.mozilla.com" ||
      host.endsWith(".notify.windows.com");
  } catch {
    return false;
  }
}

export async function notifyCompanions(
  spaceId: string,
  actorId: string,
  change: SharedChange,
  category?: string,
): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!url || !serviceKey || !publicKey || !privateKey) {
    console.warn("Shared activity saved without Web Push configuration");
    return;
  }
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: members, error: membersError } = await admin
    .from("space_memberships")
    .select("user_id")
    .eq("space_id", spaceId)
    .neq("user_id", actorId);
  if (membersError || !members?.length) return;
  const recipientIds = members.map((member: { user_id: string }) => member.user_id);
  const { data: subscriptions, error: subscriptionError } = await admin
    .from("push_subscriptions")
    .select("id,endpoint,p256dh,auth_key")
    .in("user_id", recipientIds)
    .limit(40);
  if (subscriptionError || !subscriptions?.length) return;
  const { data: profile } = await admin
    .from("space_member_names")
    .select("display_name")
    .eq("space_id", spaceId)
    .eq("user_id", actorId)
    .maybeSingle();
  const actorName = profile?.display_name || "Your companion";
  const verb = change === "created" ? "added" : change === "shared" ? "shared" : "updated";
  // Never put another member's private writing or page contents on a lock screen.
  const body = category ? `${actorName} updated ${category}.` : `${actorName} ${verb} a shared page.`;
  const payload = JSON.stringify({ body, url: category ? "/full-atlas" : `/space/${spaceId}#activity` });
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:dover847@gmail.com",
    publicKey,
    privateKey,
  );
  await Promise.allSettled(subscriptions.map(async (item: {
    id: string; endpoint: string; p256dh: string; auth_key: string
  }) => {
    if (!permittedPushEndpoint(item.endpoint)) return;
    try {
      await webpush.sendNotification({
        endpoint: item.endpoint,
        keys: { p256dh: item.p256dh, auth: item.auth_key },
      }, payload, { TTL: 3600, urgency: "normal" });
    } catch (error: unknown) {
      const code = typeof error === "object" && error !== null &&
        "statusCode" in error ? Number(error.statusCode) : 0;
      if (code === 404 || code === 410) {
        await admin.from("push_subscriptions").delete().eq("id", item.id);
      } else {
        console.warn("Web Push delivery not accepted", code || "unknown");
      }
    }
  }));
}
