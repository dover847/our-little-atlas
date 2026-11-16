"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, RefreshCw, Smartphone } from "lucide-react";

export type AtlasEvent = {
  id: string;
  actorId: string;
  actorName: string;
  action: "created" | "updated" | "shared";
  createdAt: string;
};

function decodeVapidKey(input: string): ArrayBuffer {
  const padding = "=".repeat((4 - input.length % 4) % 4);
  const str = atob((input + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = Uint8Array.from(str, (char) => char.charCodeAt(0));
  return bytes.buffer as ArrayBuffer;
}

function isInstalled() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function DeviceNotifications() {
  const [supported, setSupported] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setInstalled(isInstalled());
    if (!("serviceWorker" in navigator) ||
        !("PushManager" in window) || !("Notification" in window)) return;
    setSupported(true);
    navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" })
      .then(async (registration) => {
        const subscription = await registration.pushManager.getSubscription();
        setEnabled(Boolean(subscription) && Notification.permission === "granted");
      })
      .catch(() => setMessage("Notifications are unavailable on this device."));
  }, []);

  async function enable() {
    if (busy || !supported) return;
    setBusy(true);
    setMessage("");
    try {
      // The permission request is initiated directly by the user's tap.
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage("Notifications were not allowed. You can change this in iPhone Settings.");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) throw new Error("Push setup is unavailable.");
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeVapidKey(key),
        });
      }
      const response = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!response.ok) throw new Error("Could not register this device. Please try again.");
      setEnabled(true);
      setMessage("Notifications enabled on this device.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not enable notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMessage("");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const response = await fetch("/api/push", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        if (!response.ok) throw new Error("Could not remove this device yet.");
        await subscription.unsubscribe();
      }
      setEnabled(false);
      setMessage("Notifications turned off on this device.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not disable notifications.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="atlas-notifications">
      <div className="atlas-feature-heading">
        <Bell size={23} strokeWidth={1.4} aria-hidden="true" />
        <div>
          <h3>Notifications</h3>
          <p>Get a gentle alert when your companion shares or updates a page.</p>
        </div>
      </div>
      {!installed && (
        <p className="atlas-device-hint">
          <Smartphone size={17} aria-hidden="true" />
          On iPhone: open Atlas in Safari, tap <strong>Share → Add to Home Screen</strong>,
          then launch the new Atlas icon to enable notifications.
        </p>
      )}
      {installed && <p className="atlas-device-hint">Atlas is running from your Home Screen.</p>}
      {supported && (installed || !/iPhone|iPad|iPod/i.test(navigator.userAgent)) ? (
        <button type="button" className="button-dark" disabled={busy}
          onClick={enabled ? disable : enable}>
          {enabled ? <BellOff size={17} /> : <Bell size={17} />}
          {busy ? "Updating…" : enabled ? "Turn off notifications" : "Enable notifications"}
        </button>
      ) : (
        <p className="field-help">
          {!installed ? "Install the Home Screen app first to receive iPhone alerts." :
            "Push notifications are not supported by this browser or iOS version."}
        </p>
      )}
      {message && <p className="field-help" role="status">{message}</p>}
      <p className="field-help">
        Alerts are optional. Private pages and their contents are never sent in notifications.
      </p>
    </div>
  );
}

function verb(action: AtlasEvent["action"]) {
  return action === "created" ? "added a shared page" :
    action === "shared" ? "shared a page" : "updated a shared page";
}

export function ActivityAndNotifications({
  spaceId, userId, initialEvents,
}: {
  spaceId: string;
  userId: string;
  initialEvents: AtlasEvent[];
}) {
  const [events, setEvents] = useState(initialEvents);
  const [loading, setLoading] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const key = `atlas-activity-seen:${spaceId}:${userId}`;

  useEffect(() => {
    try {
      const existing = localStorage.getItem(key);
      const lastRead = existing ? Date.parse(existing) : Date.now();
      if (!existing) localStorage.setItem(key, new Date(lastRead).toISOString());
      setNewCount(initialEvents.filter((event) => event.actorId !== userId &&
        Date.parse(event.createdAt) > lastRead).length);
    } catch { /* Browsers with blocked local storage still show activity. */ }
  }, [key, initialEvents, userId]);

  async function refresh() {
    try {
      const response = await fetch(`/api/activity?space=${encodeURIComponent(spaceId)}`,
        { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json() as { events: AtlasEvent[] };
      setEvents(data.events);
      const lastRead = (() => { try { return Date.parse(localStorage.getItem(key) || ""); } catch { return NaN; } })();
      setNewCount(Number.isFinite(lastRead)
        ? data.events.filter((event) => event.actorId !== userId && Date.parse(event.createdAt) > lastRead).length : 0);
    } catch { /* Keep the most recently available feed. */ }
  }
  useEffect(() => {
    const id = setInterval(() => { void refresh(); }, 30000);
    return () => clearInterval(id);
  // Deliberately poll only for this space; an open screen refreshes automatically.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId, userId, key]);

  function seen() {
    try { localStorage.setItem(key, new Date().toISOString()); } catch {}
    setNewCount(0);
  }

  return (
    <section className="atlas-activity-card" id="activity" aria-labelledby="activity-heading">
      <div className="atlas-activity-pane">
        <div className="atlas-activity-top">
          <div>
            <p className="eyebrow">LITTLE SIGNS OF LIFE</p>
            <h2 id="activity-heading">What’s new together?</h2>
            <p className="field-help">Shared page changes appear here automatically.</p>
          </div>
          {newCount > 0 && <span className="atlas-new-count">{newCount} new</span>}
        </div>
        <div className="atlas-activity-actions">
          <button type="button" className="text-button" disabled={loading} onClick={async () => {
            setLoading(true); await refresh(); setLoading(false);
          }}><RefreshCw size={14}/> Refresh</button>
          {newCount > 0 && <button type="button" className="text-button" onClick={seen}>Mark seen</button>}
        </div>
        {events.length ? (
          <ul className="atlas-activity-items">
            {events.slice(0, 12).map((event) => (
              <li key={event.id}>
                <span aria-hidden="true" className="atlas-activity-dot" />
                <div>
                  <p><strong>{event.actorId === userId ? "You" : event.actorName}</strong> {verb(event.action)}</p>
                  <time dateTime={event.createdAt}>
                    {new Date(event.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="atlas-no-activity">Your shared activity will appear here when either of you shares a page.</p>}
      </div>
      <DeviceNotifications />
    </section>
  );
}
