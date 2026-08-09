// Minimal service worker — required for the app to be installable on
// Android/Chrome. Network passthrough; no offline caching in v1.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim())
);
self.addEventListener("fetch", () => {
  // Presence of a fetch handler makes the app installable.
});

// Best-effort wake-up for the offline quick-entry queue (Chrome/Android
// only — Background Sync has no Safari/iOS support). The SW can't safely
// replay the queue itself (no access to the page's Supabase session), so it
// just tells any open tab to drain; if none are open, the queue drains next
// time the app is opened instead. Never the only path to correctness.
self.addEventListener("sync", (event) => {
  if (event.tag !== "drain-quick-entry-queue") return;
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) client.postMessage({ type: "drain-quick-entry-queue" });
    })
  );
});
