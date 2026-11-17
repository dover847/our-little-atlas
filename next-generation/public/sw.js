/* Our Little Atlas: no caching of private content, only visible push notifications. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch { return; }
  const url = typeof payload.url === "string" &&
    /^\/space\/[a-f0-9-]{36}(?:#activity)?$/.test(payload.url)
    ? payload.url : "/space";
  event.waitUntil(self.registration.showNotification("Our Little Atlas", {
    body: String(payload.body || "New shared activity").slice(0, 140),
    icon: "/icon",
    badge: "/icon",
    tag: "atlas-shared-activity",
    data: { url },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = event.notification.data?.url || "/space";
  const destination = new URL(path, self.location.origin).href;
  event.waitUntil((async () => {
    const tabs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const tab of tabs) {
      if (new URL(tab.url).origin === self.location.origin) {
        await tab.focus();
        if ("navigate" in tab) await tab.navigate(destination);
        return;
      }
    }
    await self.clients.openWindow(destination);
  })());
});
