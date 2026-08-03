// parse-capture — the ONLY place JTracker calls AI (SPEC §8).
// Two modes, one AI call each:
//   kind:"screenshot" → one transaction from a receipt/screenshot/PDF receipt
//   kind:"statement"  → all transactions from a whole bank-statement PDF
// Enforces a per-user daily cap (server-authoritative) and logs every call.
// It NEVER writes transactions; the client commits after user review.

import { createClient } from "jsr:@supabase/supabase-js@2";

const DAILY_CAP = 20; // SPEC R4
const GEMINI_MODEL = "gemini-flash-latest";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

const SCREENSHOT_SCHEMA = {
  type: "OBJECT",
  properties: {
    type: { type: "STRING", enum: ["income", "expense"] },
    amount: { type: "NUMBER" },
    merchant: { type: "STRING" },
    date: { type: "STRING" },
    suggested_category: { type: "STRING" },
    confidence: { type: "NUMBER" },
  },
  required: ["type", "amount", "merchant"],
};

const STATEMENT_SCHEMA = {
  type: "OBJECT",
  properties: {
    rows: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          date: { type: "STRING" },
          description: { type: "STRING" },
          amount: { type: "NUMBER" },
          direction: { type: "STRING", enum: ["debit", "credit"] },
          // Carried in the SAME call that reads the PDF, so categorising a
          // statement costs no extra AI. SPEC §5 forbids a call PER ROW, which
          // this is not — 63 rows still cost exactly one call.
          suggested_category: { type: "STRING" },
        },
        required: ["date", "description", "amount", "direction"],
      },
    },
    statement_start: { type: "STRING" },
    statement_end: { type: "STRING" },
    opening_balance: { type: "NUMBER" },
    closing_balance: { type: "NUMBER" },
  },
  required: ["rows"],
};

function screenshotPrompt(cats: string[]): string {
  return [
    "Extract ONE transaction from a Malaysian payment screenshot/receipt (Touch 'n Go,",
    "GrabPay/Grab, DuitNow transfer, a banking-app notification, or a paper receipt).",
    "Return STRICT JSON only.",
    "- type: 'expense' unless money was clearly RECEIVED by the user (then 'income').",
    "- amount: transaction total, positive number in Ringgit.",
    "- merchant: payee/merchant or sender name, concise.",
    "- date: YYYY-MM-DD if visible, else \"\".",
    cats.length
      ? `- suggested_category: closest of: ${cats.join(", ")}.`
      : "- suggested_category: a short category name.",
    "- confidence: 0..1.",
  ].join("\n");
}

function statementPrompt(cats: string[]): string {
  return [
    "This is a Malaysian bank, credit-card or e-wallet statement (PDF). Extract",
    "EVERY transaction line. Return STRICT JSON only.",
    "- rows: one object per transaction:",
    "  - date: YYYY-MM-DD",
    "  - description: the merchant/description text",
    "  - amount: positive number in Ringgit (no sign)",
    "  - direction: 'debit' if money left the account (a card purchase is a debit),",
    "    'credit' if money came in (a payment or refund to a card is a credit)",
    cats.length
      ? `  - suggested_category: EXACTLY one of: ${cats.join(", ")}. Use the merchant name to choose. If none clearly fits, use "".`
      : '  - suggested_category: "".',
    "- statement_start, statement_end: YYYY-MM-DD of the statement period (or \"\").",
    "- opening_balance, closing_balance: numbers if shown, else 0.",
    "Do NOT include summary/subtotal/balance-carried lines as transactions.",
    "Never invent a category name that is not in the list — an empty string is",
    "always better than a guess.",
  ].join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_KEY) return json({ error: "not configured" }, 503);

  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const {
    data: { user },
    error: userErr,
  } = await admin.auth.getUser(token);
  if (userErr || !user) return json({ error: "unauthorized" }, 401);

  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const { count } = await admin
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", since.toISOString());
  if ((count ?? 0) >= DAILY_CAP) {
    return json({ code: "QUOTA", error: "Daily AI limit reached" }, 429);
  }

  let body: {
    kind?: string;
    image?: string;
    mimeType?: string;
    categories?: string[];
  };
  try {
    body = await req.json();
  } catch {
    // Almost always an oversized payload truncated in transit, not malformed JSON.
    return json(
      { code: "BAD_BODY", error: "That file was too large to send. Try a smaller PDF." },
      400
    );
  }
  const kind = body.kind;
  if (kind !== "screenshot" && kind !== "statement") {
    return json({ code: "BAD_KIND", error: "bad request" }, 400);
  }
  if (!body.image) {
    return json({ code: "NO_IMAGE", error: "That file came through empty." }, 400);
  }
  const cats = Array.isArray(body.categories) ? body.categories.slice(0, 40) : [];
  const usageKind = kind === "statement" ? "pdf" : "screenshot";
  const prompt = kind === "statement" ? statementPrompt(cats) : screenshotPrompt(cats);
  const schema = kind === "statement" ? STATEMENT_SCHEMA : SCREENSHOT_SCHEMA;

  const started = Date.now();
  let ok = true;
  let parsed: Record<string, unknown> | null = null;
  let raw = "";
  try {
    const gRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_KEY },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inline_data: { mime_type: body.mimeType || "image/jpeg", data: body.image } },
                { text: prompt },
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
            responseSchema: schema,
          },
        }),
      }
    );
    if (gRes.status === 429) {
      await admin.from("ai_usage").insert({ user_id: user.id, kind: usageKind, ok: false, latency_ms: Date.now() - started });
      return json({ code: "QUOTA", error: "AI is busy, try again or enter manually" }, 429);
    }
    const gJson = await gRes.json();
    raw = gJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    parsed = JSON.parse(raw);
  } catch {
    ok = false;
  }

  await admin.from("ai_usage").insert({
    user_id: user.id,
    kind: usageKind,
    ok,
    latency_ms: Date.now() - started,
  });

  if (!ok || !parsed) {
    return json({ error: "Couldn’t read that file. Enter it manually." }, 422);
  }
  return json({ parsed, raw_model_output: raw });
});
