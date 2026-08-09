"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  isAdmin,
  getAdSettings,
  updateAdSettings,
  listPromoCodes,
  createPromoCode,
  updatePromoCode,
  setPromoCodeActive,
  deletePromoCode,
  listPromoRedemptions,
  revokePromoRedemption,
  type AdSettings,
  type PromoCode,
  type Redemption,
} from "@/lib/api/promo";
import {
  listAdSlots,
  createAdSlot,
  updateAdSlot,
  deleteAdSlot,
  type AdSlotRow,
  type AdNetwork,
} from "@/lib/api/ad-slots";
import { useI18n } from "@/lib/i18n-client";

const NETWORKS: AdNetwork[] = ["adsense", "medianet"];

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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [editMax, setEditMax] = useState("");
  const [saving, setSaving] = useState(false);
  const [editMsg, setEditMsg] = useState<string | null>(null);

  const [adSlots, setAdSlots] = useState<AdSlotRow[]>([]);
  const [newPlacement, setNewPlacement] = useState("");
  const [newNetwork, setNewNetwork] = useState<AdNetwork>("adsense");
  const [newClientId, setNewClientId] = useState("");
  const [newSlotId, setNewSlotId] = useState("");
  const [creatingSlot, setCreatingSlot] = useState(false);
  const [slotMsg, setSlotMsg] = useState<string | null>(null);
  const [editingPlacement, setEditingPlacement] = useState<string | null>(null);
  const [editSlotNetwork, setEditSlotNetwork] = useState<AdNetwork>("adsense");
  const [editSlotClientId, setEditSlotClientId] = useState("");
  const [editSlotSlotId, setEditSlotSlotId] = useState("");
  const { t, lang } = useI18n();

  const loadCodes = useCallback(async () => {
    setCodes(await listPromoCodes());
  }, []);

  const loadRedemptions = useCallback(async () => {
    setRedemptions(await listPromoRedemptions());
  }, []);

  const loadAdSlots = useCallback(async () => {
    setAdSlots(await listAdSlots());
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
          loadAdSlots(),
        ]);
      }
    })();
  }, [loadCodes, loadRedemptions, loadAdSlots]);

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
      setMsg(t("admin.createCodeFailed"));
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(c: PromoCode) {
    await setPromoCodeActive(c.id, !c.active);
    await loadCodes();
  }

  function startEdit(c: PromoCode) {
    setEditingId(c.id);
    setEditCode(c.code);
    setEditLabel(c.label ?? "");
    setEditMax(c.max_redemptions?.toString() ?? "");
    setEditMsg(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(id: string) {
    if (!editCode.trim()) return;
    setSaving(true);
    setEditMsg(null);
    try {
      await updatePromoCode(id, {
        code: editCode.trim(),
        label: editLabel.trim() || null,
        max_redemptions: editMax ? Number(editMax) : null,
      });
      setEditingId(null);
      await loadCodes();
    } catch {
      setEditMsg(t("admin.saveEditFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function removeCode(c: PromoCode) {
    if (!confirm(t("admin.deleteCodeConfirm", { code: c.code }))) return;
    try {
      await deletePromoCode(c.id);
      await loadCodes();
    } catch {
      setMsg(t("admin.deleteCodeBlocked", { code: c.code }));
    }
  }

  async function revoke(r: Redemption) {
    if (!confirm(t("admin.revokeConfirm", { who: r.email ?? r.user_id }))) return;
    setRevoking(r.user_id);
    try {
      await revokePromoRedemption(r.user_id);
      await Promise.all([loadRedemptions(), loadCodes()]);
    } finally {
      setRevoking(null);
    }
  }

  async function createSlot() {
    if (!newPlacement.trim() || !newClientId.trim() || !newSlotId.trim()) return;
    setCreatingSlot(true);
    setSlotMsg(null);
    try {
      await createAdSlot({
        placement: newPlacement,
        network: newNetwork,
        client_id: newClientId,
        slot_id: newSlotId,
      });
      setNewPlacement("");
      setNewClientId("");
      setNewSlotId("");
      setNewNetwork("adsense");
      await loadAdSlots();
    } catch {
      setSlotMsg(t("admin.createSlotFailed"));
    } finally {
      setCreatingSlot(false);
    }
  }

  async function toggleSlotEnabled(s: AdSlotRow) {
    await updateAdSlot(s.placement, { enabled: !s.enabled });
    await loadAdSlots();
  }

  function startEditSlot(s: AdSlotRow) {
    setEditingPlacement(s.placement);
    setEditSlotNetwork(s.network);
    setEditSlotClientId(s.client_id);
    setEditSlotSlotId(s.slot_id);
  }

  async function saveEditSlot(placement: string) {
    await updateAdSlot(placement, {
      network: editSlotNetwork,
      client_id: editSlotClientId.trim(),
      slot_id: editSlotSlotId.trim(),
    });
    setEditingPlacement(null);
    await loadAdSlots();
  }

  async function removeSlot(s: AdSlotRow) {
    if (!confirm(t("admin.deleteSlotConfirm", { placement: s.placement }))) return;
    await deleteAdSlot(s.placement);
    await loadAdSlots();
  }

  if (!checked) {
    return (
      <main className="mx-auto w-full max-w-md px-4 pb-24 pt-6">
        <p className="py-20 text-center text-sm text-gray-400">{t("loading")}</p>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="mx-auto w-full max-w-md px-4 pb-24 pt-6">
        <p className="py-20 text-center text-sm text-gray-500">
          {t("admin.notAuthorized")}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-24 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-gray-900">
          {t("admin.backOffice")}
        </h1>
        <Link href="/settings" className="text-sm font-medium text-indigo-600">
          {t("done")}
        </Link>
      </header>

      {/* Ads master switch */}
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <h2 className="text-sm font-semibold text-gray-900">
          {t("admin.masterSwitch")}
        </h2>
        {settings && (
          <>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-gray-700">{t("admin.adsEnabled")}</span>
              <button
                type="button"
                onClick={() => saveSettings({ ads_enabled: !settings.ads_enabled })}
                disabled={savingSettings}
                className={`h-7 w-12 rounded-full transition-colors ${
                  settings.ads_enabled ? "bg-indigo-600" : "bg-gray-300"
                }`}
                aria-label={t("admin.toggleAdsEnabled")}
              >
                <span
                  className={`block h-5 w-5 translate-x-1 rounded-full bg-white transition-transform ${
                    settings.ads_enabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {t("admin.masterSwitchHint")}
            </p>
            <label className="mt-4 block text-sm text-gray-700">
              {t("admin.gracePeriodLabel")}
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

      {/* Ad placements */}
      <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <h2 className="text-sm font-semibold text-gray-900">{t("admin.placementsTitle")}</h2>
        <p className="mt-1 text-xs text-gray-500">
          {t("admin.placementsHint")}
        </p>

        <div className="mt-3 space-y-2">
          <input
            type="text"
            value={newPlacement}
            onChange={(e) => setNewPlacement(e.target.value)}
            placeholder={t("admin.placementKeyPlaceholder")}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
          />
          <select
            value={newNetwork}
            onChange={(e) => setNewNetwork(e.target.value as AdNetwork)}
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            {NETWORKS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <input
            type="text"
            value={newClientId}
            onChange={(e) => setNewClientId(e.target.value)}
            placeholder={t("admin.clientIdPlaceholder")}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={newSlotId}
            onChange={(e) => setNewSlotId(e.target.value)}
            placeholder={t("admin.slotIdPlaceholder")}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={createSlot}
            disabled={
              creatingSlot ||
              !newPlacement.trim() ||
              !newClientId.trim() ||
              !newSlotId.trim()
            }
            className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {creatingSlot ? t("admin.adding") : t("admin.addNewPlacement")}
          </button>
          {slotMsg && <p className="text-xs text-red-600">{slotMsg}</p>}
        </div>

        <ul className="mt-4 divide-y divide-gray-100">
          {adSlots.length === 0 && (
            <li className="py-4 text-center text-sm text-gray-400">
              {t("admin.noPlacements")}
            </li>
          )}
          {adSlots.map((s) =>
            editingPlacement === s.placement ? (
              <li key={s.placement} className="space-y-2 py-3">
                <p className="font-mono text-sm font-medium text-gray-900">
                  {s.placement}
                </p>
                <select
                  value={editSlotNetwork}
                  onChange={(e) => setEditSlotNetwork(e.target.value as AdNetwork)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  {NETWORKS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={editSlotClientId}
                  onChange={(e) => setEditSlotClientId(e.target.value)}
                  placeholder={t("admin.clientIdPlaceholder")}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  value={editSlotSlotId}
                  onChange={(e) => setEditSlotSlotId(e.target.value)}
                  placeholder={t("admin.slotIdPlaceholder")}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => saveEditSlot(s.placement)}
                    className="flex-1 rounded-xl bg-indigo-600 py-2 text-sm font-semibold text-white"
                  >
                    {t("save")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingPlacement(null)}
                    className="flex-1 rounded-xl border border-gray-300 py-2 text-sm font-semibold text-gray-700"
                  >
                    {t("cancel")}
                  </button>
                </div>
              </li>
            ) : (
              <li key={s.placement} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-sm font-medium text-gray-900">
                    {s.placement}
                  </p>
                  <p className="text-xs text-gray-400">
                    {t("admin.slotLabel", { network: s.network, slot: s.slot_id })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => startEditSlot(s)}
                  className="shrink-0 text-xs font-semibold text-indigo-600"
                >
                  {t("edit")}
                </button>
                <button
                  type="button"
                  onClick={() => toggleSlotEnabled(s)}
                  className={`shrink-0 rounded-lg px-2 py-1 text-xs font-semibold ${
                    s.enabled
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {s.enabled ? t("admin.enabled") : t("admin.disabled")}
                </button>
                <button
                  type="button"
                  onClick={() => removeSlot(s)}
                  className="shrink-0 text-xs font-semibold text-red-600"
                >
                  {t("delete")}
                </button>
              </li>
            )
          )}
        </ul>
      </section>

      {/* Promo codes */}
      <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <h2 className="text-sm font-semibold text-gray-900">{t("admin.promoCodesTitle")}</h2>

        <div className="mt-3 space-y-2">
          <input
            type="text"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            placeholder={t("admin.codePlaceholder")}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder={t("admin.labelOptional")}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            min={1}
            value={newMax}
            onChange={(e) => setNewMax(e.target.value)}
            placeholder={t("admin.maxRedemptionsPlaceholder")}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={createCode}
            disabled={creating || !newCode.trim()}
            className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {creating ? t("admin.creating") : t("admin.createCode")}
          </button>
          {msg && <p className="text-xs text-red-600">{msg}</p>}
        </div>

        <ul className="mt-4 divide-y divide-gray-100">
          {codes.length === 0 && (
            <li className="py-4 text-center text-sm text-gray-400">
              {t("admin.noCodes")}
            </li>
          )}
          {codes.map((c) =>
            editingId === c.id ? (
              <li key={c.id} className="space-y-2 py-3">
                <input
                  type="text"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  placeholder={t("admin.codePlaceholder")}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  placeholder={t("admin.labelOptional")}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  min={c.redemption_count || 0}
                  value={editMax}
                  onChange={(e) => setEditMax(e.target.value)}
                  placeholder={t("admin.maxRedemptionsPlaceholder")}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                />
                {editMax !== "" && Number(editMax) < c.redemption_count && (
                  <p className="text-xs text-amber-600">
                    {t("admin.alreadyRedeemedWarning", { n: c.redemption_count })}
                  </p>
                )}
                {editMsg && <p className="text-xs text-red-600">{editMsg}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => saveEdit(c.id)}
                    disabled={saving || !editCode.trim()}
                    className="flex-1 rounded-xl bg-indigo-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {saving ? t("saving") : t("save")}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={saving}
                    className="flex-1 rounded-xl border border-gray-300 py-2 text-sm font-semibold text-gray-700"
                  >
                    {t("cancel")}
                  </button>
                </div>
              </li>
            ) : (
              <li key={c.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-sm font-medium text-gray-900">
                    {c.code}
                  </p>
                  <p className="text-xs text-gray-400">
                    {c.label ? `${c.label} · ` : ""}
                    {t("admin.redeemedOf", {
                      count: c.redemption_count,
                      max: c.max_redemptions ?? t("admin.unlimited"),
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => startEdit(c)}
                  className="shrink-0 text-xs font-semibold text-indigo-600"
                >
                  {t("edit")}
                </button>
                <button
                  type="button"
                  onClick={() => toggleActive(c)}
                  className={`shrink-0 rounded-lg px-2 py-1 text-xs font-semibold ${
                    c.active
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {c.active ? t("admin.active") : t("admin.inactive")}
                </button>
                <button
                  type="button"
                  onClick={() => removeCode(c)}
                  className="shrink-0 text-xs font-semibold text-red-600"
                >
                  {t("delete")}
                </button>
              </li>
            )
          )}
        </ul>
      </section>

      {/* Redemptions */}
      <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <h2 className="text-sm font-semibold text-gray-900">{t("admin.redemptionsTitle")}</h2>
        <p className="mt-1 text-xs text-gray-500">
          {t("admin.redemptionsHint")}
        </p>
        <ul className="mt-3 divide-y divide-gray-100">
          {redemptions.length === 0 && (
            <li className="py-4 text-center text-sm text-gray-400">
              {t("admin.noRedemptions")}
            </li>
          )}
          {redemptions.map((r) => (
            <li key={r.user_id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  {r.email ?? r.user_id}
                </p>
                <p className="text-xs text-gray-400">
                  {t("admin.codeDate", {
                    code: r.code,
                    date: new Date(r.redeemed_at).toLocaleDateString(
                      lang === "zh" ? "zh-CN" : lang === "ms" ? "ms-MY" : "en-MY"
                    ),
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => revoke(r)}
                disabled={revoking === r.user_id}
                className="shrink-0 text-xs font-semibold text-red-600 disabled:opacity-50"
              >
                {revoking === r.user_id ? "…" : t("admin.revoke")}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
