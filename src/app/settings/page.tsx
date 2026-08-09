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
        ok: "Ads removed!",
        already: "You've already unlocked ad-free.",
        invalid: "That code isn't valid.",
        exhausted: "That code has been fully used.",
      };
      setRedeemMsg(messages[result]);
      if (result === "ok" || result === "already") {
        setAdFree(true);
        setPromoCode("");
      }
    } catch {
      setRedeemMsg("Couldn't redeem that code. Try again.");
    } finally {
      setRedeeming(false);
    }
  }

  async function undoImport(imp: ImportRow) {
    if (!confirm(`Remove this import and its ${imp.txn_count} transactions?`)) return;
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
        setMsg("Nothing to export yet.");
        return;
      }
      downloadCsv(`jtracker-${todayLocal()}.csv`, transactionsToCsv(txns, cats));
      setMsg(`Exported ${txns.length} transactions.`);
    } catch {
      setMsg("Export failed. Try again.");
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
          Settings
        </h1>
        <Link href="/" className="text-sm font-medium text-indigo-600">
          Done
        </Link>
      </header>

      {/* Account */}
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <h2 className="text-sm font-semibold text-gray-900">Account</h2>
        {signedIn ? (
          <>
            <p className="mt-1 text-xs text-gray-500">Signed in as</p>
            <p className="truncate text-sm font-medium text-gray-900">
              {account?.email ?? "Google account"}
            </p>
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className="mt-3 w-full rounded-xl border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 disabled:opacity-50"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </>
        ) : (
          <>
            <p className="mt-1 text-xs text-gray-500">
              You’re using JTracker anonymously — your data lives only in this
              browser. Sign in to keep it and sync across devices.
            </p>
            <Link
              href="/login"
              className="mt-3 block w-full rounded-xl bg-indigo-600 py-2.5 text-center text-sm font-semibold text-white"
            >
              Sign in with Google
            </Link>
          </>
        )}
      </section>

      {/* Ads */}
      <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <h2 className="text-sm font-semibold text-gray-900">Ads</h2>
        {adFree ? (
          <p className="mt-2 text-sm font-medium text-emerald-600">
            ✓ Ads removed
          </p>
        ) : signedIn ? (
          <>
            <p className="mt-1 text-xs text-gray-500">
              Have a promo code? Redeem it to remove ads permanently.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="Promo code"
                className="min-w-0 flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={redeem}
                disabled={redeeming || !promoCode.trim()}
                className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {redeeming ? "…" : "Redeem"}
              </button>
            </div>
            {redeemMsg && (
              <p className="mt-2 text-xs text-gray-600">{redeemMsg}</p>
            )}
          </>
        ) : (
          <p className="mt-1 text-xs text-gray-500">
            Sign in to redeem a promo code.
          </p>
        )}
      </section>

      {admin && (
        <p className="mt-3 px-1 text-right text-xs">
          <Link href="/admin" className="font-medium text-indigo-600">
            Back office →
          </Link>
        </p>
      )}

      {/* Imported statements */}
      {imports.length > 0 && (
        <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <h2 className="text-sm font-semibold text-gray-900">
            Imported statements
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Undo an import to remove all of its transactions.
          </p>
          <ul className="mt-2 divide-y divide-gray-100">
            {imports.map((imp) => (
              <li key={imp.id} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-gray-900">
                    {imp.statement_start && imp.statement_end
                      ? `${imp.statement_start} → ${imp.statement_end}`
                      : new Date(imp.created_at).toLocaleDateString("en-MY")}
                  </p>
                  <p className="text-xs text-gray-400">
                    {imp.txn_count} transaction{imp.txn_count === 1 ? "" : "s"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => undoImport(imp)}
                  disabled={rollingBack === imp.id}
                  className="shrink-0 text-xs font-semibold text-red-600 disabled:opacity-50"
                >
                  {rollingBack === imp.id ? "Removing…" : "Undo"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Export */}
      <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <h2 className="text-sm font-semibold text-gray-900">Export data</h2>
        <p className="mt-1 text-xs text-gray-500">
          Download all your transactions as a CSV file — your data, anytime.
        </p>
        <button
          type="button"
          onClick={exportCsv}
          disabled={busy}
          className="mt-3 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Preparing…" : "Export CSV"}
        </button>
        {msg && <p className="mt-2 text-xs text-gray-600">{msg}</p>}
      </section>

      {/* Build stamp — confirms which deployment this browser is actually running. */}
      <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <h2 className="text-sm font-semibold text-gray-900">Version</h2>
        <p className="mt-1 text-xs text-gray-500">
          Compare this against the commit you deployed. If it hasn’t changed
          after a deploy, this browser is still on the old build.
        </p>
        <p className="mt-2 font-mono text-sm tabular-nums text-gray-900">
          {buildLabel()}
        </p>
        <button
          type="button"
          onClick={hardReload}
          className="mt-3 w-full rounded-xl border border-gray-300 py-2.5 text-sm font-semibold text-gray-700"
        >
          Force refresh
        </button>
      </section>

      <p className="mt-6 px-1 text-center text-xs text-gray-400">
        JTracker · MYR · your data, your device
      </p>
    </main>
  );
}
