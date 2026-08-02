// Minimal service worker — required for the app to be installable on
// Android/Chrome. Network passthrough; no offline caching in v1.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim())
);
self.addEventListener("fetch", () => {
  // Presence of a fetch handler makes the app installable.
});
