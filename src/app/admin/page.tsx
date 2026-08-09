"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  isAdmin,
  getAdSettings,
  updateAdSettings,
  listPromoCodes,
  createPromoCode,
  setPromoCodeActive,
  deletePromoCode,
  listPromoRedemptions,
  revokePromoRedemption,
  type AdSettings,
  type PromoCode,
  type Redemption,
} from "@/lib/api/promo";

export default function AdminPage() {
  const [checked, setChecked] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  const [settings, setSettings] = useState<AdSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [newCode, setNewCode] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newMax, setNewMax] = useState("");
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [revoking, setRevoking] = useState<string | null>(null);

  const loadCodes = useCallback(async () => {
    setCodes(await listPromoCodes());
  }, []);

  const loadRedemptions = useCallback(async () => {
    setRedemptions(await listPromoRedemptions());
  }, []);

  useEffect(() => {
    (async () => {
      const ok = await isAdmin().catch(() => false);
      setAuthorized(ok);
      setChecked(true);
      if (ok) {
        await Promise.all([
          getAdSettings().then(setSettings),
          loadCodes(),
          loadRedemptions(),
        ]);
      }
    })();
  }, [loadCodes, loadRedemptions]);

  async function saveSettings(patch: Partial<AdSettings>) {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    setSavingSettings(true);
    try {
      await updateAdSettings(patch);
    } finally {
      setSavingSettings(false);
    }
  }

  async function createCode() {
    if (!newCode.trim()) return;
    setCreating(true);
    setMsg(null);
    try {
      await createPromoCode({
        code: newCode,
        label: newLabel || undefined,
        max_redemptions: newMax ? Number(newMax) : null,
      });
      setNewCode("");
      setNewLabel("");
      setNewMax("");
      await loadCodes();
    } catch {
      setMsg("Couldn't create that code — it may already exist.");
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(c: PromoCode) {
    await setPromoCodeActive(c.id, !c.active);
    await loadCodes();
  }

  async function removeCode(c: PromoCode) {
    if (!confirm(`Delete promo code "${c.code}"?`)) return;
    try {
      await deletePromoCode(c.id);
      await loadCodes();
    } catch {
      setMsg(
        `Can't delete "${c.code}" — someone has redeemed it. Revoke their access first.`
      );
    }
  }

  async function revoke(r: Redemption) {
    if (!confirm(`Revoke ad-free access for ${r.email ?? r.user_id}?`)) return;
    setRevoking(r.user_id);
    try {
      await revokePromoRedemption(r.user_id);
      await Promise.all([loadRedemptions(), loadCodes()]);
    } finally {
      setRevoking(null);
    }
  }

  if (!checked) {
    return (
      <main className="mx-auto w-full max-w-md px-4 pb-24 pt-6">
        <p className="py-20 text-center text-sm text-gray-400">Loading…</p>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="mx-auto w-full max-w-md px-4 pb-24 pt-6">
        <p className="py-20 text-center text-sm text-gray-500">
          Not authorized.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-24 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-gray-900">
          Back office
        </h1>
        <Link href="/settings" className="text-sm font-medium text-indigo-600">
          Done
        </Link>
      </header>

      {/* Ads master switch */}
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <h2 className="text-sm font-semibold text-gray-900">
          Ads master switch
        </h2>
        {settings && (
          <>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-gray-700">Ads enabled</span>
              <button
                type="button"
                onClick={() => saveSettings({ ads_enabled: !settings.ads_enabled })}
                disabled={savingSettings}
                className={`h-7 w-12 rounded-full transition-colors ${
                  settings.ads_enabled ? "bg-indigo-600" : "bg-gray-300"
                }`}
                aria-label="Toggle ads enabled"
              >
                <span
                  className={`block h-5 w-5 translate-x-1 rounded-full bg-white transition-transform ${
                    settings.ads_enabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Instantly hides ads app-wide, regardless of any account's promo
              status or grace period.
            </p>
            <label className="mt-4 block text-sm text-gray-700">
              Grace period (days before a new account sees any ad)
              <input
                type="number"
                min={0}
                value={settings.ad_grace_days}
                onChange={(e) =>
                  saveSettings({ ad_grace_days: Number(e.target.value) })
                }
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
          </>
        )}
      </section>

      {/* Promo codes */}
      <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <h2 className="text-sm font-semibold text-gray-900">Promo codes</h2>

        <div className="mt-3 space-y-2">
          <input
            type="text"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            placeholder="Code (e.g. FRIENDSFAM)"
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Label (optional)"
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            min={1}
            value={newMax}
            onChange={(e) => setNewMax(e.target.value)}
            placeholder="Max redemptions (blank = unlimited)"
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={createCode}
            disabled={creating || !newCode.trim()}
            className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create code"}
          </button>
          {msg && <p className="text-xs text-red-600">{msg}</p>}
        </div>

        <ul className="mt-4 divide-y divide-gray-100">
          {codes.length === 0 && (
            <li className="py-4 text-center text-sm text-gray-400">
              No codes yet.
            </li>
          )}
          {codes.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-sm font-medium text-gray-900">
                  {c.code}
                </p>
                <p className="text-xs text-gray-400">
                  {c.label ? `${c.label} · ` : ""}
                  {c.redemption_count} /{" "}
                  {c.max_redemptions ?? "unlimited"} redeemed
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleActive(c)}
                className={`shrink-0 rounded-lg px-2 py-1 text-xs font-semibold ${
                  c.active
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {c.active ? "Active" : "Inactive"}
              </button>
              <button
                type="button"
                onClick={() => removeCode(c)}
                className="shrink-0 text-xs font-semibold text-red-600"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Redemptions */}
      <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <h2 className="text-sm font-semibold text-gray-900">Redemptions</h2>
        <p className="mt-1 text-xs text-gray-500">
          Everyone who's currently ad-free via a promo code. Revoking removes
          it immediately — ads resume for that account.
        </p>
        <ul className="mt-3 divide-y divide-gray-100">
          {redemptions.length === 0 && (
            <li className="py-4 text-center text-sm text-gray-400">
              No redemptions yet.
            </li>
          )}
          {redemptions.map((r) => (
            <li key={r.user_id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  {r.email ?? r.user_id}
                </p>
                <p className="text-xs text-gray-400">
                  code {r.code} ·{" "}
                  {new Date(r.redeemed_at).toLocaleDateString("en-MY")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => revoke(r)}
                disabled={revoking === r.user_id}
                className="shrink-0 text-xs font-semibold text-red-600 disabled:opacity-50"
              >
                {revoking === r.user_id ? "…" : "Revoke"}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
