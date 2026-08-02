"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// Persistent "Install app" affordance — shows whenever the app is NOT installed
// (hides once installed), so it stays discoverable even after an uninstall.
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(true); // hidden until known
  const [platform, setPlatform] = useState<"android" | "ios" | "other">("other");
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    // Read install state / platform from the browser (external system) on mount.
    /* eslint-disable react-hooks/set-state-in-effect */
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    if (standalone) return;

    const ua = window.navigator.userAgent;
    setPlatform(
      /iphone|ipad|ipod/i.test(ua) ? "ios" : /android/i.test(ua) ? "android" : "other"
    );
    /* eslint-enable react-hooks/set-state-in-effect */

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  async function handleClick() {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
      return;
    }
    setShowHelp((s) => !s);
  }

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={handleClick}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 py-2.5 text-sm font-semibold text-indigo-700 active:scale-[0.99]"
      >
        ⤓ Install JTracker app
      </button>
      {showHelp && (
        <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
          {platform === "ios"
            ? "In Safari: tap the Share button, then “Add to Home Screen”."
            : "In your browser menu, choose “Install app” or “Add to Home Screen”."}
        </p>
      )}
    </div>
  );
}
