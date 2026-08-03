"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatRM, formatSen, parseAmountToSen } from "@/lib/money";
import {
  netWorth,
  KIND_LABELS,
  ACCOUNT_KINDS,
  type AccountRow,
  type AccountKind,
} from "@/lib/networth";
import {
  listAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
} from "@/lib/api/accounts";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<AccountKind>("bank");
  const [balance, setBalance] = useState("");
  const [balEdits, setBalEdits] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const list = await listAccounts();
    setAccounts(list);
    setBalEdits(
      Object.fromEntries(list.map((a) => [a.id, (a.balance_sen / 100).toFixed(2)]))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  const nw = useMemo(() => netWorth(accounts), [accounts]);

  async function add() {
    const sen = parseAmountToSen(balance) ?? 0;
    if (!name.trim()) return;
    await createAccount({ name: name.trim(), kind, balance_sen: sen });
    setName("");
    setBalance("");
    setKind("bank");
    await load();
  }

  async function saveBalance(a: AccountRow) {
    const sen = parseAmountToSen(balEdits[a.id] ?? "") ?? 0;
    if (sen === a.balance_sen) return;
    await updateAccount(a.id, { balance_sen: sen });
    await load();
  }

  async function remove(a: AccountRow) {
    if (!confirm(`Delete account "${a.name}"?`)) return;
    await deleteAccount(a.id);
    await load();
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-24 pt-6">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-gray-900">Accounts</h1>
        <Link href="/" className="text-sm font-medium text-indigo-600">Done</Link>
      </header>

      {/* Net worth */}
      <section className="mb-4 rounded-2xl bg-indigo-600 p-4 text-white shadow-sm">
        <p className="text-xs text-indigo-100">Net worth</p>
        <p
          className={`mt-1 text-3xl font-bold tabular-nums ${
            nw.netSen < 0 ? "text-red-200" : ""
          }`}
        >
          {formatRM(nw.netSen)}
        </p>
        <div className="mt-2 flex gap-4 text-xs text-indigo-100">
          <span>Assets {formatSen(nw.assetsSen)}</span>
          <span>Liabilities {formatSen(nw.liabilitiesSen)}</span>
        </div>
      </section>

      {/* Add account */}
      <section className="mb-4 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Account name (e.g. Maybank)"
          className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-base outline-none focus:border-indigo-600"
        />
        <div className="mt-2 flex gap-2">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as AccountKind)}
            className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none"
          >
            {ACCOUNT_KINDS.map((k) => (
              <option key={k} value={k}>{KIND_LABELS[k]}</option>
            ))}
          </select>
          <div className="flex flex-1 items-center rounded-xl border border-gray-300 px-2 focus-within:border-indigo-600">
            <span className="mr-1 text-sm text-gray-400">RM</span>
            <input
              type="text"
              inputMode="decimal"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="0.00"
              className="w-full bg-transparent py-2.5 text-base tabular-nums outline-none"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={add}
          disabled={!name.trim()}
          className="mt-2 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          Add account
        </button>
      </section>

      {loading ? (
        <p className="py-10 text-center text-sm text-gray-400">Loading…</p>
      ) : accounts.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-500">
          No accounts yet. Add cash, bank, e-wallet, investments, or a loan.
        </p>
      ) : (
        <ul className="space-y-2">
          {accounts.map((a) => (
            <li key={a.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{a.name}</p>
                <p className="text-xs text-gray-400">
                  {KIND_LABELS[a.kind]}
                  {a.kind === "liability" && " · owed"}
                </p>
              </div>
              <div className="flex items-center rounded-lg border border-gray-200 px-2">
                <span className="mr-1 text-xs text-gray-400">RM</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={balEdits[a.id] ?? ""}
                  onChange={(e) =>
                    setBalEdits((m) => ({ ...m, [a.id]: e.target.value }))
                  }
                  onBlur={() => saveBalance(a)}
                  className="w-20 bg-transparent py-1 text-right text-sm tabular-nums outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => remove(a)}
                className="shrink-0 text-gray-300 hover:text-red-500"
                aria-label="Delete account"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
