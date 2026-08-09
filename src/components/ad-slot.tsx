"use client";

import { useEffect, useState } from "react";
import { getAdSlot, type AdSlotRow } from "@/lib/api/ad-slots";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
    _mNHandle?: { queue: Array<() => void> };
    _mNDetails?: { loadTag: (id: string, size: string, tagId: string) => void };
  }
}

// The network loader scripts (AdSense + Media.net) live in the root layout,
// unconditional on every page — each network's site-verification crawler
// needs to see its own <script> tag regardless of any one visitor's
// ad-eligibility. This component only renders the actual ad unit for one
// placement, looked up from the DB-driven `ad_slots` table (see the admin
// back office), gated by promo/grace-period eligibility upstream.
export default function AdSlot({ placement }: { placement: string }) {
  const [slot, setSlot] = useState<AdSlotRow | null>(null);

  useEffect(() => {
    getAdSlot(placement)
      .then(setSlot)
      .catch(() => setSlot(null));
  }, [placement]);

  useEffect(() => {
    if (!slot || !slot.enabled) return;
    try {
      if (slot.network === "adsense") {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } else if (slot.network === "medianet" && window._mNHandle) {
        window._mNHandle.queue.push(() => {
          window._mNDetails?.loadTag(slot.slot_id, "auto", slot.slot_id);
        });
      }
    } catch {
      /* network script not ready yet — nothing to do */
    }
  }, [slot]);

  if (!slot || !slot.enabled) return null;

  if (slot.network === "adsense") {
    return (
      <div className="mt-4">
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={slot.client_id}
          data-ad-slot={slot.slot_id}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    );
  }

  // Media.net: best-effort standard embed (div id + loadTag queue push) —
  // not yet verified against a live account. May need adjusting once the
  // user has real Media.net-generated code, same as AdSense needed a fix
  // after testing against Google's actual crawler.
  return (
    <div className="mt-4">
      <div id={slot.slot_id} />
    </div>
  );
}
