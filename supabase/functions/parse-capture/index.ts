// parse-capture — the ONLY place JTracker calls AI (SPEC §8).
// Screenshot in → Gemini vision (one call) → strict JSON out. Enforces a
// per-user daily cap (server-authoritative via service role) and logs every
// call. It NEVER writes transactions; the client commits after user review.

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

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    type: { type: "STRING", enum: ["income", "expense"] },
    amount: { type: "NUMBER" },
    merchant: { type: "STRING" },
    date: { type: "STRING" }, // YYYY-MM-DD, or "" if not visible
    suggested_category: { type: "STRING" },
    confidence: { type: "NUMBER" },
  },
  required: ["type", "amount", "merchant"],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_KEY) return json({ error: "not configured" }, 503);

  // --- Auth: validate the caller's JWT (anonymous is fine) ---
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const {
    data: { user },
    error: userErr,
  } = await admin.auth.getUser(token);
  if (userErr || !user) return json({ error: "unauthorized" }, 401);

  // --- Daily cap (server-authoritative) ---
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

  // --- Input ---
  let body: {
    kind?: string;
    image?: string;
    mimeType?: string;
    categories?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad request" }, 400);
  }
  if (body.kind !== "screenshot" || !body.image) {
    return json({ error: "bad request" }, 400);
  }
  const cats = Array.isArray(body.categories) ? body.categories.slice(0, 40) : [];

  const prompt = [
    "You are extracting ONE transaction from a Malaysian payment screenshot or receipt",
    "(Touch 'n Go eWallet, GrabPay/Grab, DuitNow transfer, a banking-app notification,",
    "or a photo of a paper receipt). Return STRICT JSON only.",
    "- type: 'expense' unless it's clearly money RECEIVED by the user (then 'income').",
    "- amount: the transaction total as a positive number in Ringgit (e.g. 12.90).",
    "- merchant: the payee/merchant or sender name, concise.",
    "- date: the transaction date as YYYY-MM-DD if visible, else \"\".",
    cats.length
      ? `- suggested_category: choose the closest from this list: ${cats.join(", ")}.`
      : "- suggested_category: a short category name.",
    "- confidence: 0..1.",
  ].join("\n");

  const started = Date.now();
  let ok = true;
  let parsed: Record<string, unknown> | null = null;
  let raw = "";
  try {
    const gRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: body.mimeType || "image/jpeg",
                    data: body.image,
                  },
                },
                { text: prompt },
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
          },
        }),
      }
    );
    if (gRes.status === 429) {
      await admin.from("ai_usage").insert({ user_id: user.id, kind: "screenshot", ok: false, latency_ms: Date.now() - started });
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
    kind: "screenshot",
    ok,
    latency_ms: Date.now() - started,
  });

  if (!ok || !parsed) {
    return json({ error: "Couldn’t read that image. Enter it manually." }, 422);
  }
  return json({ parsed, raw_model_output: raw });
});
