"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatRM, formatSen } from "@/lib/money";
import PinPad from "@/components/pin-pad";
import AmountInput from "@/components/amount-input";
import {
  hasNetWorthPin,
  setNetWorthPin,
  verifyNetWorthPin,
  clearNetWorthPin,
} from "@/lib/api/networth-pin";
import {
  listNetWorthItems,
  createNetWorthItem,
  updateNetWorthItem,
  deleteNetWorthItem,
} from "@/lib/api/networth-items";
import {
  netWorth,
  KIND_LABELS,
  ITEM_KINDS,
  type NetWorthItem,
  type ItemKind,
} from "@/lib/networth-items";

type Status =
  | "loading"
  | "signin_required"
  | "setup"
  | "confirm_setup"
  | "locked_out"
  | "enter_pin"
  | "unlocked";

export default function NetWorthPage() {
  const [status, setStatus] = useState<Status>("loading");
  const [pin, setPin] = useState("");
  const [confirmFirst, setConfirmFirst] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [items, setItems] = useState<NetWorthItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<ItemKind>("investment");
  const [amountSen, setAmountSen] = useState(0);
  const [balEdits, setBalEdits] = useState<Record<string, number>>({});

  const loadItems = useCallback(async () => {
    setItemsLoading(true);
    const list = await listNetWorthItems();
    setItems(list);
    setBalEdits(Object.fromEntries(list.map((i) => [i.id, i.balance_sen])));
    setItemsLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const resetting = params.get("resetpin") === "1";
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || user.is_anonymous) {
        setStatus("signin_required");
        return;
      }
      if (resetting) {
        await clearNetWorthPin();
        window.history.replaceState(null, "", "/networth");
        setStatus("setup");
        return;
      }
      const has = await hasNetWorthPin();
      setStatus(has ? "enter_pin" : "setup");
    })();
  }, []);

  function onPinChange(v: string) {
    setPin(v);
    setPinError(null);
    if (v.length === 4 && !busy) {
      void handlePinComplete(v);
    }
  }

  async function handlePinComplete(entered: string) {
    if (status === "setup") {
      setConfirmFirst(entered);
      setPin("");
      setStatus("confirm_setup");
      return;
    }
    if (status === "confirm_setup") {
      if (entered !== confirmFirst) {
        setPinError("PINs didn’t match — try again.");
        setPin("");
        setConfirmFirst("");
        setStatus("setup");
        return;
      }
      setBusy(true);
      try {
        await setNetWorthPin(entered);
        setPin("");
        setStatus("unlocked");
        await loadItems();
      } catch {
        setPinError("Couldn’t save PIN. Try again.");
        setPin("");
        setStatus("setup");
      } finally {
        setBusy(false);
      }
      return;
    }
    if (status === "enter_pin") {
      setBusy(true);
      try {
        const result = await verifyNetWorthPin(entered);
        if (result === "ok") {
          setPin("");
          setStatus("unlocked");
          await loadItems();
        } else if (result === "locked") {
          setPin("");
          setStatus("locked_out");
        } else if (result === "no_pin") {
          setPin("");
          setStatus("setup");
        } else {
          setPinError("Wrong PIN.");
          setPin("");
        }
      } catch {
        setPinError("Something went wrong. Try again.");
        setPin("");
      } finally {
        setBusy(false);
      }
    }
  }

  function lock() {
    setItems([]);
    setPin("");
    setPinError(null);
    setStatus("enter_pin");
  }

  async function forgotPin() {
    if (
      !confirm(
        "This signs you out — you'll need to sign back in with Google before setting a new PIN. Continue?"
      )
    )
      return;
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = `/login?next=${encodeURIComponent("/networth?resetpin=1")}`;
  }

  const nw = useMemo(() => netWorth(items), [items]);

  async function add() {
    if (!name.trim() || amountSen <= 0) return;
    await createNetWorthItem({ name: name.trim(), kind, balance_sen: amountSen });
    setName("");
    setAmountSen(0);
    setKind("investment");
    await loadItems();
  }

  async function saveBalance(it: NetWorthItem) {
    const sen = balEdits[it.id] ?? it.balance_sen;
    if (sen === it.balance_sen) return;
    await updateNetWorthItem(it.id, { balance_sen: sen });
    await loadItems();
  }

  async function remove(it: NetWorthItem) {
    if (!confirm(`Delete "${it.name}"?`)) return;
    await deleteNetWorthItem(it.id);
    await loadItems();
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-24 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-gray-900">
          Net Worth
        </h1>
        <Link href="/" className="text-sm font-medium text-indigo-600">
          Done
        </Link>
      </header>

      {status === "loading" && (
        <p className="py-10 text-center text-sm text-gray-400">Loading…</p>
      )}

      {status === "signin_required" && (
        <section className="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-black/5">
          <p className="text-3xl">🔒</p>
          <p className="mt-2 text-sm font-medium text-gray-900">
            Sign in to use Net Worth
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Net Worth is protected by a PIN tied to your account, so it needs
            a real sign-in — not an anonymous session.
          </p>
          <Link
            href={`/login?next=${encodeURIComponent("/networth")}`}
            className="mt-4 block w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white"
          >
            Sign in with Google
          </Link>
        </section>
      )}

      {(status === "setup" || status === "confirm_setup") && (
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <p className="text-center text-sm font-medium text-gray-900">
            {status === "setup"
              ? "Set up a 4-digit PIN"
              : "Re-enter your PIN to confirm"}
          </p>
          <p className="mt-1 text-center text-xs text-gray-500">
            You’ll need this every time you open Net Worth.
          </p>
          <div className="mt-5">
            <PinPad value={pin} onChange={onPinChange} error={!!pinError} />
          </div>
          {pinError && (
            <p className="mt-3 text-center text-xs text-red-600">{pinError}</p>
          )}
        </section>
      )}

      {status === "enter_pin" && (
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <p className="text-center text-sm font-medium text-gray-900">
            Enter your PIN
          </p>
          <div className="mt-5">
            <PinPad value={pin} onChange={onPinChange} error={!!pinError} />
          </div>
          {pinError && (
            <p className="mt-3 text-center text-xs text-red-600">{pinError}</p>
          )}
          <button
            type="button"
            onClick={forgotPin}
            className="mt-5 block w-full text-center text-xs font-medium text-gray-400"
          >
            Forgot PIN?
          </button>
        </section>
      )}

      {status === "locked_out" && (
        <section className="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-black/5">
          <p className="text-3xl">⏳</p>
          <p className="mt-2 text-sm font-medium text-gray-900">
            Too many attempts
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Try again in a few minutes.
          </p>
          <button
            type="button"
            onClick={forgotPin}
            className="mt-4 block w-full text-center text-xs font-medium text-gray-400"
          >
            Forgot PIN?
          </button>
        </section>
      )}

      {status === "unlocked" && (
        <>
          <section className="mb-4 rounded-2xl bg-indigo-600 p-4 text-white shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-indigo-100">Net worth</p>
                <p
                  className={`mt-1 text-3xl font-bold tabular-nums ${
                    nw.netSen < 0 ? "text-red-200" : ""
                  }`}
                >
                  {formatRM(nw.netSen)}
                </p>
              </div>
              <button
                type="button"
                onClick={lock}
                className="shrink-0 rounded-lg bg-indigo-500 px-2.5 py-1 text-xs font-medium text-white"
              >
                🔒 Lock
              </button>
            </div>
            <div className="mt-2 flex gap-4 text-xs text-indigo-100">
              <span>Assets {formatSen(nw.assetsSen)}</span>
              <span>Liabilities {formatSen(nw.liabilitiesSen)}</span>
            </div>
          </section>

          <section className="mb-4 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Item name (e.g. ASB, EPF, Tesla stock)"
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-base outline-none focus:border-indigo-600"
            />
            <div className="mt-2 flex gap-2">
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as ItemKind)}
                className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none"
              >
                {ITEM_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABELS[k]}
                  </option>
                ))}
              </select>
              <div className="flex flex-1 items-center rounded-xl border border-gray-300 px-2 focus-within:border-indigo-600">
                <span className="mr-1 text-sm text-gray-400">RM</span>
                <AmountInput
                  sen={amountSen}
                  onChangeSen={setAmountSen}
                  className="w-full bg-transparent py-2.5 text-base tabular-nums outline-none"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={add}
              disabled={!name.trim() || amountSen <= 0}
              className="mt-2 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              Add item
            </button>
          </section>

          {itemsLoading ? (
            <p className="py-10 text-center text-sm text-gray-400">Loading…</p>
          ) : items.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500">
              No net worth items yet. Add investments, EPF, property, or a
              loan above.
            </p>
          ) : (
            <ul className="space-y-2">
              {items.map((it) => (
                <li
                  key={it.id}
                  className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {it.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {KIND_LABELS[it.kind]}
                      {it.kind === "liability" && " · owed"}
                    </p>
                  </div>
                  <div className="flex items-center rounded-lg border border-gray-200 px-2">
                    <span className="mr-1 text-xs text-gray-400">RM</span>
                    <AmountInput
                      sen={balEdits[it.id] ?? 0}
                      onChangeSen={(v) =>
                        setBalEdits((m) => ({ ...m, [it.id]: v }))
                      }
                      className="w-20 bg-transparent py-1 text-right text-sm tabular-nums outline-none"
                      ariaLabel={`${it.name} balance`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => saveBalance(it)}
                    className="shrink-0 text-xs font-medium text-indigo-600"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(it)}
                    className="shrink-0 text-gray-300 hover:text-red-500"
                    aria-label="Delete item"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
