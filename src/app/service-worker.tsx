"use client";

import { useEffect } from "react";

// Registers the service worker so the app is installable on Android/Chrome.
export default function ServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          // Best-effort Background Sync registration (Chrome/Android only —
          // unsupported browsers just skip this silently). This is purely an
          // optimization so a queued offline entry can sync even if the app
          // isn't open when connectivity returns; correctness never depends
          // on it, since page.tsx also drains on mount and on `online`.
          const syncManager = (
            reg as ServiceWorkerRegistration & {
              sync?: { register: (tag: string) => Promise<void> };
            }
          ).sync;
          syncManager?.register("drain-quick-entry-queue").catch(() => {});
        })
        .catch(() => {
          // Registration can fail (e.g. private mode) — the app still works.
        });
    }
  }, []);
  return null;
}
