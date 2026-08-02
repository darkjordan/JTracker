# JTracker — Personal Money Tracker PWA (Project Spec)

> **Purpose of this file:** Hand this to an AI coding agent (Claude Sonnet) as the single source of truth for a weekend build. Follow phases in order. Phase gates are mandatory. This app reuses the JKira stack and patterns (Supabase, PWA, Gemini edge function, EN/中文/BM i18n, Google SSO) — where this spec says "same as JKira", port the existing pattern rather than reinventing it.

---

## 1. Product Summary

**JTracker** is a Malaysian personal money tracker. It tracks **income, expenses, and categories** with near-zero manual effort: transactions enter the app via free-text quick entry, screenshot capture (TnG/Grab/banking notifications, physical receipts), and monthly **bank statement PDF import**. It visualizes spending with client-side graphs and — the differentiator — tracks expenses against **LHDN personal tax relief categories** year-round so tax filing in March is a report, not a panic.

**Core design decisions (do not deviate):**

1. **AI at capture only, never at render.** Gemini is called exactly when new raw data (text/image/PDF) enters the app. Everything downstream — graphs, totals, filters, tax relief progress — is SQL + client-side computation. No "AI insights", no chat-with-your-data.
2. **Merchant memory before AI.** A `merchant_memory` table maps normalized merchant strings → category + tax relief tag. AI is only called for merchants not in memory. This is the primary free-tier budget control.
3. **Review-before-save.** Every AI-parsed result (screenshot or PDF) is shown to the user for confirmation/edit before rows are written. No silent auto-commit. Failed parses are corrected by hand, never by automatic retry.
4. **MYR, integer sen.** All money is stored and computed as integer sen (`amount_sen`). Same rule as JKira: money never exists as a float outside `lib/money.ts`.
5. **Single-user, private data.** Unlike JKira there is no sharing, no links, no guests. Every row is owned by one user and protected by RLS.
6. **Anonymous start, SSO nudge.** User can start instantly with an anonymous Supabase session (same as JKira), but the app nudges Google sign-in after 10 saved transactions with an explicit warning: "Your data lives only on this browser until you sign in." CSV export is available from Phase 1.
7. **PWA.** Installable, same install-button pattern as JKira. Registers as a **Web Share Target** (post-install) so screenshots can be shared into JTracker from the Android share sheet.

---

## 2. AI Budget & Privacy Rules (HARD CONSTRAINTS)

The Gemini API key is on the **free tier**. Free-tier Flash allows on the order of ~10 requests/minute and a daily cap in the low hundreds. The app must comfortably run on **≤ 10 AI calls/day** for a single active user.

**Rules the implementation must enforce:**

- **R1.** One Gemini call per screenshot. One Gemini call per statement PDF (send the whole PDF in a single multimodal request; do not paginate into multiple calls).
- **R2.** Free-text quick entry does **not** call AI by default. Parse locally: extract amount via regex (`RM?\s*\d+(\.\d{1,2})?`), treat the remaining text as merchant/description, resolve category via `merchant_memory` → fallback to category `Uncategorized`. Only if the user taps "AI assist" on an ambiguous entry is a single Gemini text call made.
- **R3.** Before any categorization call, check `merchant_memory`. On user confirmation of a category, upsert into `merchant_memory` so the same merchant never costs a call again.
- **R4.** All Gemini access goes through a Supabase Edge Function (`parse-capture`) that hides the key (same pattern as JKira's receipt function). The function enforces a per-user daily cap (default 20 calls/day) and returns a clear "quota reached, enter manually" error the UI must handle gracefully.
- **R5.** No background/scheduled AI jobs. No re-categorization sweeps. No AI on page load, ever.
- **R6.** On 429 from Gemini, show the manual-entry fallback immediately. Do not auto-retry more than once.

**Privacy note (surface this in the import UI):** Free-tier Gemini data may be used by Google to improve its products. Before uploading a bank statement PDF, the UI shows a one-time notice recommending the user crop/redact the account-number header, with a "don't show again" checkbox. (If the developer later moves the key to a paid tier, this notice can be removed.)

---

## 3. Data Model (Supabase / Postgres)

All tables have `user_id uuid` referencing the auth user (anonymous or Google), with RLS: `user_id = auth.uid()` for all operations. No security-definer public access — this app has no link-sharing.

### `transactions`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| user_id | uuid | RLS owner |
| type | text | `income` \| `expense` |
| amount_sen | integer | always positive; sign implied by `type` |
| currency | text | `MYR` (fixed v1) |
| merchant | text | display name, e.g. "Tealive SS15" |
| merchant_norm | text | normalized key (upper, trimmed, collapse spaces, strip store numbers) |
| category_id | uuid fk | |
| tax_relief_code | text nullable | fk to `tax_relief_categories.code` |
| occurred_at | date | transaction date |
| note | text nullable | |
| source | text | `manual` \| `text` \| `screenshot` \| `pdf` |
| import_id | uuid nullable | fk to `imports`, set for pdf rows |
| dedupe_hash | text | sha1 of `user_id + occurred_at + amount_sen + merchant_norm`; unique index — prevents double-import |
| created_at | timestamptz | |

### `categories`
Seeded system defaults + user-created. Columns: `id, user_id nullable (null = system default), name, icon (emoji), color, type (income|expense|both), sort_order`.

**Seed expense categories:** Food & Drink 🍜, Groceries 🛒, Transport 🚗, Bills & Utilities 💡, Shopping 🛍️, Health 🏥, Education 📚, Entertainment 🎬, Family 👨‍👩‍👧, Travel ✈️, Donation & Zakat 🕌, Uncategorized ❓.
**Seed income categories:** Salary 💼, Freelance 🧑‍💻, Dividends 📈, Other Income ➕.

### `merchant_memory`
`id, user_id, merchant_norm (unique per user), category_id, tax_relief_code nullable, times_used int, updated_at`. Updated on every confirmed save. This is a per-user table (person A's "Tealive" habit shouldn't leak to person B).

### `imports`
`id, user_id, kind (pdf|screenshot), status (parsing|review|committed|failed), file_path (Supabase Storage), txn_count, created_at`. Statement files live in a private Storage bucket, auto-delete after 30 days (cleanup can be a manual TODO note, not a scheduled job, in v1).

### `tax_relief_categories` (static seed table)
`code, name_en, name_ms, name_zh, annual_cap_sen nullable, notes`.

Seed with the standard LHDN personal relief categories, e.g.: `lifestyle` (books, internet, phone, computer — RM2,500 cap), `sports` (equipment/gym — separate cap), `medical_self`, `medical_parents`, `education_self`, `childcare`, `sspn`, `insurance_life`, `insurance_medical`, `epf`, `zakat`, `donation`.

> ⚠️ **Builder note:** relief caps change by assessment year. Seed the table with a `year` column and mark amounts as `TODO: verify against LHDN for YA2026` — do not treat the caps in this spec as authoritative. The UI must show caps as editable in Settings so the user can correct them without a code change.

---

## 4. Capture Flows

### 4.1 Quick entry (free text) — the everyday cash path
Single input box pinned at top of dashboard. User types `nasi lemak 8.50` or `salary 5200 income`.
- Local parse (R2): amount regex, `income` keyword flips type, remainder = merchant.
- Category resolved from `merchant_memory`, else `Uncategorized` with the category picker pre-opened.
- One-tap save. Entire flow must work offline-queued (see §7 PWA).

### 4.2 Screenshot capture
Sources: file upload button, camera, or **Web Share Target** (share a screenshot from gallery/another app into JTracker).
- Client compresses image (reuse JKira's compression util) → Edge Function `parse-capture` → Gemini vision.
- Prompt asks for strict JSON: `{ type, amount, merchant, date, suggested_category, confidence }`. Handles: TnG eWallet receipts, GrabPay/Grab ride summaries, DuitNow transfer confirmations, banking app push-notification screenshots, physical receipts.
- Result shown in a **review sheet** (editable fields, category picker, tax relief picker) → Save. Confirmed merchant/category upserts `merchant_memory`.
- If the screenshot contains a transfer the user *received*, default type to `income`.

### 4.3 Bank statement PDF import (the retention feature)
- Upload PDF → stored in private bucket → one Gemini call with the full PDF (R1).
- Prompt returns strict JSON array: `[{ date, description, amount, direction (debit|credit) }]` plus `{ statement_start, statement_end, opening_balance, closing_balance }`.
- **Reconciliation check (same spirit as JKira's receipt total check):** opening + credits − debits must equal closing. If mismatch, show a warning banner on the review screen — do not block, just flag.
- **Review table:** every parsed row with checkbox (default on), category (from `merchant_memory` where known, else Uncategorized — do NOT spend AI calls categorizing statement rows individually), inline edit. Rows failing `dedupe_hash` uniqueness are shown greyed-out as "already imported".
- Commit writes all checked rows in one insert with `import_id`.
- An import can be rolled back: deleting an `imports` row cascades its transactions.

---

## 5. Dashboard & Graphs (zero AI)

Charting: **Recharts** (or Chart.js — pick one, keep bundle small). All aggregates via SQL views or client-side reduce over the fetched month.

Screens/widgets:
1. **This-month header card:** income total, expense total, net. Tap toggles to "vs last month" deltas.
2. **Category donut** for the selected month, tap a slice → filtered transaction list.
3. **6-month trend** — grouped bar (income vs expense per month) with net line overlay.
4. **Daily spending sparkline** for current month (spot the payday spike).
5. **Tax relief progress bars** (see §6).
6. **Transaction list:** infinite scroll grouped by day, filter by category/type/source, search by merchant. Swipe-to-edit/delete.

All charts must render from a single month-window query; do not fetch all history to draw a donut.

---

## 6. Tax Relief Tracker (the differentiator)

- Any expense can be tagged with a `tax_relief_code` (in the review sheet, transaction editor, or bulk-tag from the list).
- `merchant_memory` remembers relief tags too — tag "Popular Bookstore → lifestyle" once, every future Popular purchase auto-tags.
- **Relief dashboard:** one progress bar per relief category — `used / cap`, e.g. "Lifestyle: RM1,840 / RM2,500 — RM660 left before 31 Dec". Categories with no cap show a running total.
- **Year-end report:** a single screen (and CSV export) listing every tagged transaction grouped by relief code — exactly what the user needs open beside the e-Filing form in March.
- Caps editable in Settings (see §3 builder note). Assessment year selector (calendar year).

---

## 7. Accounts, i18n, PWA (port from JKira)

- **Auth:** anonymous Supabase session on first open; optional Google SSO to persist across devices. On sign-in, migrate anonymous user's rows to the Google identity (Supabase `linkIdentity` / or server-side user-id update — verify current Supabase anonymous-link API at build time). SSO nudge banner after 10 transactions.
- **CSV export:** Settings → export all transactions (and relief report) as CSV. Ship in Phase 1 — this is the data-safety escape hatch.
- **i18n:** EN / 中文 / Bahasa Malaysia, same switcher pattern and persistence as JKira. All seed category and relief names localized (columns provided in §3).
- **PWA:** manifest + icons (`JTracker` wordmark, keep JKira's visual family), install button on dashboard, service worker. **Web Share Target** in manifest for images (`share_target` with `enctype: multipart/form-data`) — note it only activates after install; the upload button covers the pre-install case. Offline: quick-entry writes queue in IndexedDB and sync when online; captures/imports require connectivity (show clear message).

---

## 8. Edge Function: `parse-capture`

- Input: `{ kind: 'screenshot' | 'pdf' | 'text', payload }` (image base64 / storage path / raw text).
- Auth: requires valid Supabase JWT (anonymous ok). Per-user daily counter in a `usage` table; reject over cap with structured error `{ code: 'QUOTA' }`.
- Calls Gemini Flash with a JSON-schema-constrained prompt per kind. Temperature 0.
- Returns parsed JSON + `raw_model_output` for debugging. Never writes to `transactions` itself — the client commits after review (rule R3 in §2... i.e. review-before-save, decision #3).
- Log every call (kind, tokens if available, latency) to a `usage` table so the developer can watch free-tier consumption.

---

## 9. Out of Scope (v1 guardrails)

- ❌ Bank API / open banking sync
- ❌ Budgets, alerts, push notifications
- ❌ Chat-with-your-finances / AI insights / anomaly detection
- ❌ Multi-currency, multi-account balances
- ❌ Shared/household tracking
- ❌ Recurring transaction auto-generation (v2 candidate)
- ❌ Receipt line-item breakdown (whole-receipt amount only — this is not JKira)
- ❌ Payments of any kind — JTracker never touches money movement

When the coding agent proposes any of these mid-build, point it back here.

---

## 10. Build Phases

**Phase 1 — Money core + manual entry.** `lib/money.ts` (integer sen, formatters), schema migrations for `transactions`/`categories`/`tax_relief_categories`, seed data, RLS, quick-entry local parser, transaction list + editor, CSV export. **Gate:** Vitest green on money lib + text parser (amounts like `8.50`, `RM 8.5`, `1,250.00`, income keyword, no-amount rejection); RLS verified (user B cannot read user A).

**Phase 2 — Dashboard & graphs.** Month header card, donut, 6-month trend, sparkline, filters/search. **Gate:** charts render from single-month queries; demoable on a phone.

**Phase 3 — Screenshot capture.** `parse-capture` edge function (screenshot kind), usage caps, upload/camera UI, review sheet, `merchant_memory` upsert on confirm. **Gate:** TnG receipt, Grab summary, and bank-notification screenshots each parse and save end-to-end; second capture from the same merchant makes zero categorization calls.

**Phase 4 — PDF statement import.** Storage bucket, pdf kind in edge function, reconciliation check, review table with dedupe greying, commit + rollback. **Gate:** importing the same statement twice produces zero duplicate rows; balance mismatch shows warning without blocking.

**Phase 5 — Tax relief.** Relief tagging in all editors, memory-based auto-tag, progress bars, year-end report + CSV. **Gate:** caps editable in Settings; report groups correctly by code and year.

**Phase 6 — PWA + i18n + SSO polish.** Manifest with share_target, service worker, offline quick-entry queue, install button, language switcher with full localization, Google SSO + anonymous-account migration, SSO nudge, privacy notice on PDF upload. **Gate:** installed app receives a shared screenshot from the gallery; language persists; anonymous data survives sign-in.

**Definition of done per phase:** typecheck clean, existing tests green, feature demoable on a phone.

---

## 11. Conventions (same as JKira)

- TypeScript strict mode. No `any` in `src/lib`.
- Money never leaves `lib/money.ts` as a float. Grep-able rule: `*_sen` suffix on all money variables.
- All Supabase access through `src/lib/api/` — no raw client calls in components.
- All Gemini access through the edge function — the API key never appears client-side.
- ESLint + Prettier defaults; components under ~200 lines, extract hooks.
- Commit per phase minimum; conventional commits (`feat:`, `fix:`, `test:`).
