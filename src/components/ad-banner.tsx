"use client";

import { useEffect } from "react";

const CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
const SLOT_ID = process.env.NEXT_PUBLIC_ADSENSE_DASHBOARD_SLOT;

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

// The AdSense loader script itself lives in the root layout (unconditional,
// on every page) — Google's site-verification crawler needs to see it
// regardless of any one visitor's ad-eligibility. This component only
// renders the actual ad unit, gated by promo/grace-period logic upstream.
export default function AdBanner() {
  useEffect(() => {
    if (!CLIENT_ID || !SLOT_ID) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* AdSense script not ready yet — nothing to do */
    }
  }, []);

  if (!CLIENT_ID || !SLOT_ID) return null;

  return (
    <div className="mt-4">
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={CLIENT_ID}
        data-ad-slot={SLOT_ID}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
