# JTracker — "duit." personal money tracker (project instructions)

**duit.** is a Malaysian personal money tracker PWA: income/expense/categories with
near-zero manual entry (free-text quick entry, screenshot capture, bank-statement
PDF import), client-side graphs, and year-round **LHDN tax-relief tracking**.
Single-user, private, and it **never moves money**. Reuses the JKira stack/patterns.

## Source of truth
**[SPEC.md](SPEC.md) is authoritative** for product and engineering decisions.
Build the phases in order; **phase gates are mandatory**. If any request conflicts
with SPEC.md (especially the "Out of scope" list in §9), point back to it. This
file holds the working rules; SPEC.md holds the what/why.

## Non-negotiable rules
1. **Test end-to-end before EVERY `git push`.** Each phase gate (see SPEC §10) must
   pass: typecheck clean, Vitest green, feature demoable on a phone. For device-only
   paths, say so explicitly and get real-device confirmation before pushing.
2. **Git identity: commit as `darkjordan <jordan.chin90@gmail.com>`.** Never a
   work/corporate email. (Set as this repo's local git config — verify before the
   first commit of a session.)
3. **Commit/push only when asked.** Conventional commits (`feat:`/`fix:`/`test:`),
   at least one commit per phase.
4. **Never commit secrets.** `.env.local` is gitignored; the Gemini and Supabase
   service keys never appear client-side. If a secret is pasted in chat, advise
   rotating it.
5. **Money is integer sen.** Money never leaves `src/lib/money.ts` as a float; every
   money variable ends in `_sen`. MYR only in v1.

## AI budget — HARD constraints (SPEC §2)
- **AI at capture only, never at render.** No AI on page load, no re-categorization
  sweeps, no chat/insights/anomaly detection.
- **Check `merchant_memory` before any Gemini call**; upsert on user confirmation so
  a merchant never costs a second call. Free-text quick entry parses **locally**
  (regex), no AI unless the user taps "AI assist".
- **One Gemini call per screenshot; one per whole PDF.** All Gemini access goes
  through the `parse-capture` Supabase **Edge Function** (key hidden), which enforces
  a per-user daily cap and returns `{ code: 'QUOTA' }` when exceeded. On 429 →
  manual-entry fallback, at most one retry.
- **Review-before-save always.** The edge function never writes `transactions`; the
  client commits after the user confirms. Target ≤10 AI calls/day/user.

## Stack (same as JKira)
Next.js 15 (App Router) + React + TypeScript (**strict**, no `any` in `src/lib`) +
Tailwind + Supabase (Postgres / RLS / Auth / Storage / **Edge Functions**) + Vercel.
Charts: Recharts *or* Chart.js (pick one, keep the bundle small). Tests: **Vitest**.

**Reference implementation to port from: `../Jkira`** — i18n (EN/中文/BM) switcher +
persistence, PWA (manifest/install button/service worker), Google SSO + anonymous
session + link-on-signin, client-side image compression, Gemini prompt +
JSON-schema output, and the receipt reconciliation-check pattern.
Note: JKira calls Gemini from a Next.js API route; **duit. requires a Supabase Edge
Function** (`parse-capture`) instead — follow the spec.

## Conventions (SPEC §11)
- No `any` in `src/lib`. **All Supabase access through `src/lib/api/`** — no raw
  client calls in components. Components ~<200 lines; extract hooks. ESLint +
  Prettier defaults.

## Architecture at a glance (detail in SPEC §3–§8)
- **Data model:** `transactions`, `categories` (seeded system + user), `merchant_memory`
  (per-user), `imports`, `tax_relief_categories` (seed, with a `year` column; caps are
  `TODO: verify vs LHDN` and editable in Settings), `usage` (AI call log + daily cap).
  **RLS `user_id = auth.uid()` on every table** — no public/security-definer access.
- **Capture:** quick text (local parse) · screenshot (edge fn → review sheet →
  commit + `merchant_memory` upsert) · PDF statement (whole-PDF edge call →
  reconciliation check + `dedupe_hash` greying → commit/rollback).
- **Dashboard:** month-window queries only (header card, donut, 6-mo trend,
  sparkline, relief progress). **Zero AI.**
- **Tax relief:** tag with LHDN codes, memory auto-tags, progress vs editable caps,
  year-end report + CSV.

## Commands (once scaffolded)
```bash
npm run dev / build / lint
npm run test        # Vitest (money lib + parsers first)
```
Supabase SQL via the **Supabase MCP** (`execute_sql`, `apply_migration`) or the
Management API (**one statement per call**). Keep migrations in `supabase/migrations/`.

## Environment variables (names only; set in `.env.local` + Vercel)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and (Edge Function
secrets, server-side) `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` as needed.

## Current status (keep short; update as phases ship)
**Not yet scaffolded.** Repo holds SPEC.md + CLAUDE.md + README. **Next: Phase 1**
(money core + manual entry). No Supabase project or Vercel deploy exists for duit.
yet — create these at the start of Phase 1.
