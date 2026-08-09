"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { listAllTransactions, todayLocal } from "@/lib/api/transactions";
import { listCategories } from "@/lib/api/categories";
import { transactionsToCsv, downloadCsv } from "@/lib/csv";
import { listImports, rollbackImport, type ImportRow } from "@/lib/api/imports";
import { buildLabel } from "@/lib/version";
import {
  getAdFreeStatus,
  redeemPromoCode,
  isAdmin,
  type RedeemResult,
} from "@/lib/api/promo";
import { useI18n } from "@/lib/i18n-client";
import LanguageSwitcher from "@/app/language-switcher";

type Account = { email: string | null; anonymous: boolean } | null;

/**
 * Drop every cache and re-fetch from the network. An installed PWA can hold a
 * stale bundle in the HTTP cache long after a deploy, which looks exactly like
 * a deploy that never happened.
 */
async function hardReload() {
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    const reg = await navigator.serviceWorker?.getRegistration();
    await reg?.update();
  } catch {
    /* best-effort — reload regardless */
  }
  window.location.replace(`${window.location.pathname}?r=${Date.now()}`);
}

export default function SettingsPage() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [account, setAccount] = useState<Account>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [imports, setImports] = useState<ImportRow[]>([]);
  const [rollingBack, setRollingBack] = useState<string | null>(null);
  const [adFree, setAdFree] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState<string | null>(null);
  const { t, lang } = useI18n();

  const loadAccount = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setAccount(
      user ? { email: user.email ?? null, anonymous: !!user.is_anonymous } : null
    );
  }, []);

  const loadImports = useCallback(async () => {
    try {
      setImports(await listImports());
    } catch {
      /* ignore */
    }
  }, []);

  const loadAds = useCallback(async () => {
    try {
      const [free, adm] = await Promise.all([getAdFreeStatus(), isAdmin()]);
      setAdFree(free);
      setAdmin(adm);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    (async () => {
      await loadAccount();
      await loadImports();
      await loadAds();
    })();
  }, [loadAccount, loadImports, loadAds]);

  async function redeem() {
    if (!promoCode.trim()) return;
    setRedeeming(true);
    setRedeemMsg(null);
    try {
      const result: RedeemResult = await redeemPromoCode(promoCode.trim());
      const messages: Record<RedeemResult, string> = {
        ok: t("settings.redeemOk"),
        already: t("settings.redeemAlready"),
        invalid: t("settings.redeemInvalid"),
        exhausted: t("settings.redeemExhausted"),
      };
      setRedeemMsg(messages[result]);
      if (result === "ok" || result === "already") {
        setAdFree(true);
        setPromoCode("");
      }
    } catch {
      setRedeemMsg(t("settings.redeemFailed"));
    } finally {
      setRedeeming(false);
    }
  }

  async function undoImport(imp: ImportRow) {
    if (!confirm(t("settings.removeImportConfirm", { n: imp.txn_count }))) return;
    setRollingBack(imp.id);
    try {
      await rollbackImport(imp.id, imp.file_path);
      await loadImports();
    } finally {
      setRollingBack(null);
    }
  }

  async function exportCsv() {
    setBusy(true);
    setMsg(null);
    try {
      const [txns, cats] = await Promise.all([
        listAllTransactions(),
        listCategories(),
      ]);
      if (txns.length === 0) {
        setMsg(t("settings.nothingToExport"));
        return;
      }
      downloadCsv(`jtracker-${todayLocal()}.csv`, transactionsToCsv(txns, cats));
      setMsg(t("settings.exportedCount", { n: txns.length }));
    } catch {
      setMsg(t("settings.exportFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setSigningOut(true);
    await createClient().auth.signOut();
    window.location.href = "/"; // proxy creates a fresh anonymous session
  }

  const signedIn = account && !account.anonymous;

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-24 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-gray-900">
          {t("settings.title")}
        </h1>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link href="/" className="text-sm font-medium text-indigo-600">
            {t("done")}
          </Link>
        </div>
      </header>

      {/* Account */}
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <h2 className="text-sm font-semibold text-gray-900">{t("settings.account")}</h2>
        {signedIn ? (
          <>
            <p className="mt-1 text-xs text-gray-500">{t("settings.signedInAs")}</p>
            <p className="truncate text-sm font-medium text-gray-900">
              {account?.email ?? t("settings.googleAccount")}
            </p>
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className="mt-3 w-full rounded-xl border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 disabled:opacity-50"
            >
              {signingOut ? t("settings.signOutInProgress") : t("settings.signOut")}
            </button>
          </>
        ) : (
          <>
            <p className="mt-1 text-xs text-gray-500">{t("settings.anonHint")}</p>
            <Link
              href="/login"
              className="mt-3 block w-full rounded-xl bg-indigo-600 py-2.5 text-center text-sm font-semibold text-white"
            >
              {t("settings.signInGoogle")}
            </Link>
          </>
        )}
      </section>

      {/* Ads */}
      <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <h2 className="text-sm font-semibold text-gray-900">{t("settings.ads")}</h2>
        {adFree ? (
          <p className="mt-2 text-sm font-medium text-emerald-600">
            {t("settings.adsRemoved")}
          </p>
        ) : signedIn ? (
          <>
            <p className="mt-1 text-xs text-gray-500">{t("settings.promoHint")}</p>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder={t("settings.promoCode")}
                className="min-w-0 flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={redeem}
                disabled={redeeming || !promoCode.trim()}
                className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {redeeming ? "…" : t("settings.redeem")}
              </button>
            </div>
            {redeemMsg && (
              <p className="mt-2 text-xs text-gray-600">{redeemMsg}</p>
            )}
          </>
        ) : (
          <p className="mt-1 text-xs text-gray-500">{t("settings.signInToRedeem")}</p>
        )}
      </section>

      {admin && (
        <p className="mt-3 px-1 text-right text-xs">
          <Link href="/admin" className="font-medium text-indigo-600">
            {t("settings.backOffice")}
          </Link>
        </p>
      )}

      {/* Imported statements */}
      {imports.length > 0 && (
        <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <h2 className="text-sm font-semibold text-gray-900">
            {t("settings.importedStatements")}
          </h2>
          <p className="mt-1 text-xs text-gray-500">{t("settings.undoImportHint")}</p>
          <ul className="mt-2 divide-y divide-gray-100">
            {imports.map((imp) => (
              <li key={imp.id} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-gray-900">
                    {imp.statement_start && imp.statement_end
                      ? `${imp.statement_start} → ${imp.statement_end}`
                      : new Date(imp.created_at).toLocaleDateString(
                          lang === "zh" ? "zh-CN" : lang === "ms" ? "ms-MY" : "en-MY"
                        )}
                  </p>
                  <p className="text-xs text-gray-400">
                    {imp.txn_count === 1
                      ? t("settings.transactionOne")
                      : t("settings.transactionMany", { n: imp.txn_count })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => undoImport(imp)}
                  disabled={rollingBack === imp.id}
                  className="shrink-0 text-xs font-semibold text-red-600 disabled:opacity-50"
                >
                  {rollingBack === imp.id ? t("settings.removing") : t("settings.undo")}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Export */}
      <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <h2 className="text-sm font-semibold text-gray-900">{t("settings.exportData")}</h2>
        <p className="mt-1 text-xs text-gray-500">{t("settings.exportHint")}</p>
        <button
          type="button"
          onClick={exportCsv}
          disabled={busy}
          className="mt-3 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? t("settings.exportPreparing") : t("settings.exportCsv")}
        </button>
        {msg && <p className="mt-2 text-xs text-gray-600">{msg}</p>}
      </section>

      {/* Build stamp — confirms which deployment this browser is actually running. */}
      <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <h2 className="text-sm font-semibold text-gray-900">{t("settings.version")}</h2>
        <p className="mt-1 text-xs text-gray-500">{t("settings.versionHint")}</p>
        <p className="mt-2 font-mono text-sm tabular-nums text-gray-900">
          {buildLabel()}
        </p>
        <button
          type="button"
          onClick={hardReload}
          className="mt-3 w-full rounded-xl border border-gray-300 py-2.5 text-sm font-semibold text-gray-700"
        >
          {t("settings.forceRefresh")}
        </button>
      </section>

      <p className="mt-6 px-1 text-center text-xs text-gray-400">
        {t("settings.footer")}
      </p>
    </main>
  );
}
