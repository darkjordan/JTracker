"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getHousehold,
  createHousehold,
  createInviteUrl,
  joinHousehold,
  leaveHousehold,
  approveMember,
  rejectMember,
  removeMember,
  type Household,
} from "@/lib/api/household";
import { useI18n } from "@/lib/i18n-client";

export default function HouseholdPage() {
  const [household, setHousehold] = useState<Household | null>(null);
  const [me, setMe] = useState<{ id: string; email: string | null; anon: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [name, setName] = useState("");
  const { t } = useI18n();

  const load = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setMe(user ? { id: user.id, email: user.email ?? null, anon: !!user.is_anonymous } : null);
    setHousehold(await getHousehold());
    setLoading(false);
  }, []);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("invite");
    // Read the invite token from the URL (external) on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (token) setInviteToken(token);
    (async () => {
      await load();
    })();
  }, [load]);

  async function doCreate() {
    setBusy(true);
    setMsg(null);
    try {
      await createHousehold(name.trim());
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function doInvite() {
    setBusy(true);
    setMsg(null);
    try {
      const url = await createInviteUrl();
      if (navigator.share) {
        await navigator.share({ title: "Join my JTracker household", url });
      } else {
        await navigator.clipboard.writeText(url);
        setMsg(t("household.inviteLinkCopied"));
      }
    } catch {
      setMsg(t("household.inviteFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function doJoin() {
    if (!inviteToken || me?.anon) return; // login is mandatory to join
    setBusy(true);
    setMsg(null);
    try {
      await joinHousehold(inviteToken);
      setInviteToken(null);
      window.history.replaceState(null, "", "/household");
      await load();
      setMsg(t("household.requestSent"));
    } catch {
      setMsg(t("household.inviteInvalid"));
    } finally {
      setBusy(false);
    }
  }

  async function doLeave() {
    if (!confirm(t("household.leaveConfirm"))) return;
    setBusy(true);
    try {
      await leaveHousehold();
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function doApprove(userId: string) {
    setBusyId(userId);
    try {
      await approveMember(userId);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function doReject(userId: string) {
    setBusyId(userId);
    try {
      await rejectMember(userId);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function doRemove(userId: string, label: string) {
    if (!confirm(t("household.removeConfirm", { label }))) return;
    setBusyId(userId);
    try {
      await removeMember(userId);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const inThisHousehold = !!inviteToken && !!household;
  const myMembership = household?.members.find((m) => m.user_id === me?.id);
  const isOwner = myMembership?.role === "owner";
  const iAmPending = myMembership?.status === "pending";
  const active = household?.members.filter((m) => m.status === "active") ?? [];
  const pending = household?.members.filter((m) => m.status === "pending") ?? [];

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-24 pt-6">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-gray-900">{t("household.title")}</h1>
        <Link href="/" className="text-sm font-medium text-indigo-600">{t("done")}</Link>
      </header>

      {/* Pending invite (opened a fresh invite link) */}
      {inviteToken && !inThisHousehold && (
        <section className="mb-4 rounded-2xl bg-indigo-50 p-4 ring-1 ring-indigo-200">
          <p className="text-sm font-medium text-indigo-900">
            {t("household.invitedTitle")}
          </p>
          <p className="mt-1 text-xs text-indigo-700">
            {t("household.invitedHint")}
          </p>
          {me?.anon ? (
            <>
              <p className="mt-2 text-xs text-indigo-700">
                {t("household.signInFirstHint")}
              </p>
              <Link
                href={`/login?next=${encodeURIComponent(`/household?invite=${inviteToken}`)}`}
                className="mt-3 block w-full rounded-xl bg-indigo-600 py-2.5 text-center text-sm font-semibold text-white"
              >
                {t("household.signInToJoin")}
              </Link>
            </>
          ) : (
            <button
              type="button"
              onClick={doJoin}
              disabled={busy}
              className="mt-3 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? t("household.requesting") : t("household.requestToJoin")}
            </button>
          )}
        </section>
      )}

      {loading ? (
        <p className="py-10 text-center text-sm text-gray-400">{t("loading")}</p>
      ) : household ? (
        <>
          {/* Pending-approval waiting state for the requester themselves */}
          {iAmPending && (
            <section className="mb-4 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
              <p className="text-sm font-medium text-amber-900">
                {t("household.waitingApproval")}
              </p>
              <p className="mt-1 text-xs text-amber-700">
                {t("household.waitingApprovalHint", { name: household.name })}
              </p>
            </section>
          )}

          {/* Owner: pending join requests */}
          {isOwner && pending.length > 0 && (
            <section className="mb-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
              <h2 className="text-sm font-semibold text-gray-900">
                {t("household.joinRequests", { n: pending.length })}
              </h2>
              <ul className="mt-2 divide-y divide-gray-100">
                {pending.map((m) => (
                  <li key={m.user_id} className="flex items-center justify-between gap-2 py-2">
                    <span className="min-w-0 flex-1 truncate text-sm text-gray-900">
                      {m.email || t("household.anonymous")}
                    </span>
                    <button
                      type="button"
                      onClick={() => doReject(m.user_id)}
                      disabled={busyId === m.user_id}
                      className="shrink-0 rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-600 disabled:opacity-50"
                    >
                      {t("household.reject")}
                    </button>
                    <button
                      type="button"
                      onClick={() => doApprove(m.user_id)}
                      disabled={busyId === m.user_id}
                      className="shrink-0 rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {t("household.approve")}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <h2 className="text-sm font-semibold text-gray-900">{household.name}</h2>
            <p className="mt-1 text-xs text-gray-500">
              {active.length === 1
                ? t("household.memberCountOne")
                : t("household.memberCountMany", { n: active.length })}
            </p>
            <ul className="mt-3 divide-y divide-gray-100">
              {active.map((m) => (
                <li key={m.user_id} className="flex items-center gap-2 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate text-gray-900">
                    {m.email || t("household.anonymousNotSignedIn")}
                    {m.user_id === me?.id && <span className="text-gray-400">{t("household.you")}</span>}
                  </span>
                  <span className="shrink-0 text-xs text-gray-400 capitalize">{m.role}</span>
                  {isOwner && m.user_id !== me?.id && (
                    <button
                      type="button"
                      onClick={() => doRemove(m.user_id, m.email || t("household.thisMember"))}
                      disabled={busyId === m.user_id}
                      className="shrink-0 text-xs font-medium text-red-500 disabled:opacity-50"
                    >
                      {t("household.remove")}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {isOwner && (
            <button
              type="button"
              onClick={doInvite}
              disabled={busy}
              className="mt-4 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {t("household.inviteShare")}
            </button>
          )}
          <button
            type="button"
            onClick={doLeave}
            disabled={busy}
            className="mt-2 w-full rounded-xl border border-gray-300 py-2.5 text-sm font-semibold text-gray-600 disabled:opacity-50"
          >
            {iAmPending ? t("household.cancelRequest") : t("household.leaveHousehold")}
          </button>
        </>
      ) : (
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <h2 className="text-sm font-semibold text-gray-900">{t("household.shareWithFamily")}</h2>
          <p className="mt-1 text-xs text-gray-500">
            {t("household.createHint")}{" "}
            {me?.anon && t("household.signInFirstShort")}
          </p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("household.namePlaceholder")}
            className="mt-3 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-base outline-none focus:border-indigo-600"
          />
          <button
            type="button"
            onClick={doCreate}
            disabled={busy}
            className="mt-2 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {t("household.createHousehold")}
          </button>
        </section>
      )}

      {msg && <p className="mt-3 text-center text-xs text-gray-600">{msg}</p>}

      <p className="mt-6 px-1 text-center text-[11px] text-gray-400">
        {t("household.footer")}
      </p>
    </main>
  );
}
