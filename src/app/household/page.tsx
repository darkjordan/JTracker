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
  type Household,
} from "@/lib/api/household";

export default function HouseholdPage() {
  const [household, setHousehold] = useState<Household | null>(null);
  const [me, setMe] = useState<{ id: string; email: string | null; anon: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [name, setName] = useState("");

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
    const t = new URLSearchParams(window.location.search).get("invite");
    // Read the invite token from the URL (external) on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (t) setInviteToken(t);
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
        setMsg("Invite link copied to clipboard.");
      }
    } catch {
      setMsg("Couldn’t create invite.");
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
      setMsg("Joined! Your finances are now shared.");
    } catch {
      setMsg("That invite is invalid or expired.");
    } finally {
      setBusy(false);
    }
  }

  async function doLeave() {
    if (!confirm("Leave this household? Shared data stays with the household.")) return;
    setBusy(true);
    try {
      await leaveHousehold();
      await load();
    } finally {
      setBusy(false);
    }
  }

  const inThisHousehold =
    !!inviteToken && !!household; // already in a household when an invite is open

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-24 pt-6">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-gray-900">Household</h1>
        <Link href="/" className="text-sm font-medium text-indigo-600">Done</Link>
      </header>

      {/* Pending invite */}
      {inviteToken && (
        <section className="mb-4 rounded-2xl bg-indigo-50 p-4 ring-1 ring-indigo-200">
          <p className="text-sm font-medium text-indigo-900">
            You’ve been invited to a household
          </p>
          <p className="mt-1 text-xs text-indigo-700">
            Joining <b>merges your data into the shared household</b> — all members
            can see and edit everything.
          </p>
          {me?.anon ? (
            <>
              <p className="mt-2 text-xs text-indigo-700">
                Sign in with Google first — a joined household needs a real account
                so it follows you across devices.
              </p>
              <Link
                href={`/login?next=${encodeURIComponent(`/household?invite=${inviteToken}`)}`}
                className="mt-3 block w-full rounded-xl bg-indigo-600 py-2.5 text-center text-sm font-semibold text-white"
              >
                Sign in with Google to join
              </Link>
            </>
          ) : (
            <button
              type="button"
              onClick={doJoin}
              disabled={busy}
              className="mt-3 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Joining…" : inThisHousehold ? "Switch to this household" : "Join household"}
            </button>
          )}
        </section>
      )}

      {loading ? (
        <p className="py-10 text-center text-sm text-gray-400">Loading…</p>
      ) : household ? (
        <>
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <h2 className="text-sm font-semibold text-gray-900">{household.name}</h2>
            <p className="mt-1 text-xs text-gray-500">
              {household.members.length} member{household.members.length === 1 ? "" : "s"} · everyone shares all finances
            </p>
            <ul className="mt-3 divide-y divide-gray-100">
              {household.members.map((m) => (
                <li key={m.user_id} className="flex items-center justify-between py-2 text-sm">
                  <span className="truncate text-gray-900">
                    {m.email || "Anonymous (not signed in)"}
                    {m.user_id === me?.id && <span className="text-gray-400"> · you</span>}
                  </span>
                  <span className="text-xs text-gray-400 capitalize">{m.role}</span>
                </li>
              ))}
            </ul>
          </section>

          <button
            type="button"
            onClick={doInvite}
            disabled={busy}
            className="mt-4 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Invite someone (share link)
          </button>
          <button
            type="button"
            onClick={doLeave}
            disabled={busy}
            className="mt-2 w-full rounded-xl border border-gray-300 py-2.5 text-sm font-semibold text-gray-600 disabled:opacity-50"
          >
            Leave household
          </button>
        </>
      ) : (
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <h2 className="text-sm font-semibold text-gray-900">Share with your family</h2>
          <p className="mt-1 text-xs text-gray-500">
            Create a household and invite others. All members see and edit the same
            transactions, accounts, goals, and tax relief. {me?.anon && "Sign in with Google first so it syncs across devices."}
          </p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Household name (e.g. Chin Family)"
            className="mt-3 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-base outline-none focus:border-indigo-600"
          />
          <button
            type="button"
            onClick={doCreate}
            disabled={busy}
            className="mt-2 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Create household
          </button>
        </section>
      )}

      {msg && <p className="mt-3 text-center text-xs text-gray-600">{msg}</p>}

      <p className="mt-6 px-1 text-center text-[11px] text-gray-400">
        Fully shared: household members can see & edit all of the household’s data.
      </p>
    </main>
  );
}
