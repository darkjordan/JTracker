"use client";

import { useEffect } from "react";

// Registers the service worker so the app is installable on Android/Chrome.
export default function ServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration can fail (e.g. private mode) — the app still works.
      });
    }
  }, []);
  return null;
}
