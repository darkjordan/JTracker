# JTracker — personal money tracker (project instructions)

**JTracker** is a Malaysian personal money tracker PWA: income/expense/categories with
near-zero manual entry (free-text quick entry, screenshot capture, bank-statement
PDF import), client-side graphs, and year-round **LHDN tax-relief tracking**.
Single-user, private, and it **never moves money**. Reuses the JKira stack/patterns.

## Source of truth
**[SPEC.md](SPEC.md) is authoritative** for product and engineering decisions.
Build the phases in order; **phase gates are mandatory**. If any request conflicts
with SPEC.md (especially the "Out of scope" list in §9), point back to it. This
file holds the working rules; SPEC.md holds the what/why.

## Non-negotiable rules
0. **Snapshot before destructive DB ops.** Before any `delete`/`truncate`/
   destructive migration, run `select backups.take_snapshot();` (or dump the
   affected rows) first — the Free plan has NO restorable backup/PITR. Nightly
   snapshots exist (`backups` schema, 14-day JSONB retention, see
   `supabase/migrations/0004_backups.sql`) but they don't cover the moments
   between runs. (A wipe of 155 test anon accounts on 2026-08-03 was done without
   a prior snapshot — don't repeat that on real data.)
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
Tailwind v4 + Supabase (Postgres / RLS / Auth / Storage / **Edge Functions**) +
Vercel. Charts: Recharts *or* Chart.js (pick one, keep the bundle small). Tests:
**Vitest**.

> **Next.js 15 note** (see `AGENTS.md`): this Next may differ from training-data
> priors. Authoritative docs are bundled at `node_modules/next/dist/docs/` — check
> them before using an API you're unsure about.

**Reference implementation to port from: `../Jkira`** — i18n (EN/中文/BM) switcher +
persistence, PWA (manifest/install button/service worker), Google SSO + anonymous
session + link-on-signin, client-side image compression, Gemini prompt +
JSON-schema output, and the receipt reconciliation-check pattern.
Note: JKira calls Gemini from a Next.js API route; **JTracker requires a Supabase Edge
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
**Phase 1 DONE** (money core + manual entry). Gate passed: Vitest 15/15
(`money.ts`, `parse-entry.ts`), build + lint clean, RLS verified (user B cannot
read/spoof user A). Shipped: `src/lib/money.ts`, `src/lib/parse-entry.ts`,
`src/lib/api/` (transactions, categories, types), `src/lib/csv.ts`, dashboard
(`src/app/page.tsx`) with quick-entry + month summary + list + editor, `/settings`
CSV export, Supabase client/server + anon-session proxy.
- **Supabase project `jtracker`** ref `yhepkangpnrcrvetusfy` (region ap-southeast-1),
  anon sign-ins enabled. Migrations in `supabase/migrations/` (0001 schema+RLS,
  0002 seed). Apply via Management API (curl; Python UA is Cloudflare-blocked 1010).
- **Next 15 note:** the top-level convention is `src/proxy.ts` (`export function
  proxy`), NOT `middleware.ts` (deprecated).
- **Light mode only** (dark mode removed from `globals.css`). Dashboard load() has
  error+retry so it can't hang.
- **Phone testing over LAN: use a production build** (`next build && next start -H
  0.0.0.0 -p 3001`). `next dev` over a LAN IP fails — its HMR websocket can't connect
  and hydration never runs (symptom: stuck on "Loading…"). Verified via Playwright.
- **Playwright** (devDep) is available for headless/mobile E2E checks.
- **Plan expanded (2026-08-02)** per Monarch-inspired screenshots — see SPEC §9a + §10:
  Phase 2 now Dashboard **& Reports** (KPI tiles, savings rate, cash-flow, search/
  filters/reviewed); new **Phase 6 Accounts & Net Worth** (manual, no bank API),
  **Phase 7 Recurring & Subscriptions** (detection, zero AI), **Phase 8 Goals**;
  PWA/i18n/SSO moved to **Phase 9**. Partner-sharing stays OUT (single-user).
- **Phase 2 DONE** (Dashboard & Reports). Month switcher + KPI tiles (income/
  expense/net/savings rate) + category donut (tap-to-filter) + cash-flow bar +
  daily sparkline + 6-month trend (Recharts) + transaction search/type/category
  filters + "mark reviewed" (reviewed column). Privacy **eye masks only the KPI
  tiles**. `lib/stats.ts` pure + unit-tested (24 Vitest total). Verified via
  Playwright mobile on the prod LAN build.
- **Primary URL: https://jtracker-my.vercel.app** (`jtracker.vercel.app` was taken
  globally). It's a manual alias → re-run `vercel alias set <prod-deployment>
  jtracker-my.vercel.app` after a `vercel --prod` if it stops pointing to latest.
  Supabase site_url + allow-list use this domain. Older `jtracker-jcmy`/`-silk`
  aliases still work.
- **DEPLOYED (2026-08-02):** live (Vercel
  team `jcmy`, project `jtracker`, id `prj_iajul72jMpYU1kxxZShgV8Ok0bVJ`). Prod env
  vars `NEXT_PUBLIC_SUPABASE_URL` + `_ANON_KEY` set. **Deployment Protection
  (ssoProtection) is OFF** (must stay off — it gates the app behind Vercel SSO).
  Deployed via Vercel CLI (`npx vercel --prod --token …`), NOT connected to GitHub
  git-integration — so pushes do **not** auto-deploy; re-run `vercel --prod` (or
  connect the repo in Vercel → Settings → Git for auto-deploy). The Vercel token is
  a secret — never commit it; rotate after use.
- **PWA + Google SSO LIVE (2026-08-02).** PWA: manifest + JT icons + service
  worker + install prompt (installable iOS/Android). SSO: `/login` (Continue with
  Google), `/auth/callback`, anonymous→Google `linkIdentity` (preserves data),
  Settings Account section (sign out). Supabase Google provider enabled (its own
  OAuth client `497669363037-ku2s…`, redirect `…/auth/v1/callback`), site_url +
  allow-list + manual linking set. Verified: authorize 302→accounts.google.com.
  Consent screen lives in the shared GCP project (project #497669363037) so it may
  show JKira branding; if it's in "Testing" mode, the signer's email must be a
  Google **test user**. The Google **secret** lives only in Supabase config, never
  in the repo.
- **Anonymous-data policy (2026-08-03):** anonymous = ephemeral per-browser
  session; on sign-in it's upgraded in place via `linkIdentity` (data migrates to
  the permanent account, nothing copied/orphaned). A `pg_cron` job
  `purge_stale_anon` (daily 03:00 UTC, see `supabase/migrations/0003_anon_retention.sql`)
  deletes anonymous users >30d old, or empty ones >1d — so stray anonymous data
  never accumulates (leak prevention). Deleting an auth user cascades their rows.
- **Phase 3 DONE + LIVE (2026-08-03):** screenshot capture. Edge function
  `parse-capture` deployed (Gemini `gemini-flash-latest` vision, strict JSON
  schema, temp 0, server-side daily cap 20 via `ai_usage`, never writes txns).
  `GEMINI_API_KEY` secret set on the project (shared with JKira's free key).
  Client: ScanButton + CaptureReview (review-before-save) + `merchant_memory`
  (category remembered per merchant; shows "· remembered" on repeat). Verified:
  synthetic receipt parsed (TEALIVE/RM8.50/date/Food&Drink), save creates row,
  2nd scan same merchant → remembered; 401 no-auth, 400 bad body, usage logged.
  Deploy edge fn via `SUPABASE_ACCESS_TOKEN=<sbp> npx supabase functions deploy
  parse-capture --project-ref yhepkangpnrcrvetusfy` (no Docker needed).
- **Phase 4 DONE + LIVE (2026-08-03):** bank-statement PDF import. `imports`
  table + `transactions.import_id` cascade FK + private `statements` storage
  bucket (RLS <uid>/…). Edge fn `statement` kind: one Gemini call → rows
  {date,description,amount,direction} + opening/closing/period. Client: privacy
  notice, reconciliation warning (non-blocking), review table (checkboxes +
  category selects + dedupe greying via sha1 `dedupe_hash`), commit tags rows
  with import_id + remembers categories; Settings → "Imported statements" → Undo
  (rollback cascades rows + deletes file). Gate verified E2E on live: re-import =
  0 dupes, balance mismatch warns without blocking, commit + rollback work.
- **Phase 4 hardening (2026-08-03)** — from a real RHB credit-card import:
  - **PDF preflight** (`src/lib/pdf.ts`, pure + tested): rejects password-protected
    statements *before* spending an AI call (most MY bank e-statements ship
    encrypted), plus `looksScanned` (image-per-page; fonts prove nothing — scanner
    apps stamp a "CamScanner" text watermark). PDF cap 10 MB → **5 MB**: base64 is
    4/3 the size in one JSON body, and oversize was surfacing as a bare 400.
  - **`rows: []` is schema-valid**, so an empty parse used to open a review sheet
    with a disabled button and no explanation. Now explained — the usual cause is
    importing **page 1 only**, which on a card statement is the summary (balance/
    limit/due date) and genuinely lists no transactions.
  - **Commit errors are no longer swallowed.** Two live constraints abort a whole
    batch insert: `amount_sen > 0` (23514 — statements carry RM 0.00 lines) and
    `UNIQUE (user_id, dedupe_hash)` (23505 — `existingHashes()` only checked rows
    already saved, never duplicates *within* the same batch). Both are now filtered
    client-side and mapped to actionable messages.
  - **Reconciliation was inverted for credit cards** (`src/lib/reconcile.ts`): a
    purchase raises what you owe, so `opening + debit − credit`. Every card import
    warned falsely; it now accepts either orientation.
  - **Vitest had no `@/` alias** (`vitest.config.ts`), so anything importing `@/`
    was untestable and uncovered.
- **Deployment truth (corrected 2026-08-03)** — the earlier "pushes do NOT
  auto-deploy" note was **wrong**. GitHub git-integration **is** connected:
  every push to `main` builds and promotes to production automatically
  (`source: "git"`), and branch pushes build as previews.
  - **`jtracker-my.vercel.app` is a stale manual alias** and does NOT follow
    production. It was pinned to a CLI deployment (`d54caf4`) while production
    had moved two commits ahead — which looked exactly like "the fix didn't
    deploy". **`jtracker-jcmy.vercel.app` / `jtracker-silk.vercel.app` /
    `jtracker-git-main-jcmy.vercel.app` do follow production** — prefer those.
    Re-point the alias with `vercel alias set <prod-deployment> jtracker-my.vercel.app`.
  - **Verify, don't assume:** Settings → Version shows the build's commit sha,
    and `curl <url>/version` returns `{sha, builtAt}` (`no-store`). Compare
    against the commit you expect before concluding a fix didn't ship.
  - **Vercel dedupes identical SHAs.** Pushing the same commit to a branch and
    then to `main` builds it once (as the preview) and creates **no** production
    deployment. Land a new commit on `main` to force a production build.
  - **Preview deployments 500** on every route: `NEXT_PUBLIC_SUPABASE_URL` /
    `_ANON_KEY` are set for the **Production environment only**, so `src/proxy.ts`
    throws "Your project's URL and Key are required to create a Supabase client".
    Set both for Preview in Vercel → Settings → Environment Variables to fix.
- **Phase 5 DONE + LIVE (2026-08-03):** tax relief. `relief_settings` per-user
  cap overrides (migration 0007). `lib/relief.ts` pure aggregation (tested).
  `api/tax-relief.ts`: effective cap = override ?? LHDN default; setReliefCap
  (null reverts). Relief tagging (expense-only) in transaction-editor +
  capture-review, teaches `merchant_memory.tax_relief_code`. `/relief` page:
  year selector, claimed total, per-code progress vs editable caps, CSV report.
  Gate verified E2E on live: tag → report total + row, edit cap → bar recomputes.
- **Phase 6 + 7 DONE + LIVE (2026-08-04):**
  - **Accounts & Net Worth** (manual): `accounts` table + RLS; `lib/networth.ts`
    (net = assets − liabilities, tested); `/accounts` page (net-worth card, add/
    edit-balance-inline/delete). No txn↔account auto-balance (deferred; manual
    balances avoid double-counting).
  - **Recurring** (zero-AI detection): `recurring_dismissed` table + RLS;
    `lib/recurring.ts` (groups expenses by merchant_norm, ~monthly gap 24–35d,
    ≥3 charges → next-due + monthly total, tested); `/recurring` page (detected
    list, dismiss/restore). Migration 0008. **Plus user-planned recurring items**
    (`recurring_plans` table, migration 0009): add a subscription/bill manually
    (name, amount, cadence weekly/monthly/yearly, next due); monthly total =
    detected + planned monthly-equivalents. `/recurring` "Plan a recurring item".
  - Dashboard: 3-link nav row (Accounts / Recurring / Relief). Gate verified E2E
    on live (net worth math + edit; Netflix detected + dismiss/restore).
- **Next: Phase 8** (Goals — savings goals with target/date/progress), then
  Phase 9 (i18n EN/中文/BM polish). PWA + Google SSO already shipped.
