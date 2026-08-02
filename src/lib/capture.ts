import { createClient } from "@/lib/supabase/client";

export type ParsedCapture = {
  type: "income" | "expense";
  amount: number;
  merchant: string;
  date?: string;
  suggested_category?: string;
  confidence?: number;
};

export type CaptureResult =
  | { ok: true; parsed: ParsedCapture }
  | { ok: false; error: string; quota?: boolean };

const MAX_DIM = 1400; // screenshots read fine well under this
const MAX_PDF_BYTES = 10 * 1024 * 1024; // keep the request small

function isPdf(file: File): boolean {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

/** Compress an image to a base64 JPEG (no data: prefix) for the edge function. */
async function toBase64Jpeg(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no-canvas");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return dataUrl.split(",")[1] ?? "";
}

/** Base64-encode a PDF's raw bytes (no data: prefix), in chunks to avoid overflow. */
async function pdfToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Turn any supported file into { data, mimeType } for the edge function. */
async function toPayload(
  file: File
): Promise<{ data: string; mimeType: string }> {
  if (isPdf(file)) {
    if (file.size > MAX_PDF_BYTES) throw new Error("pdf-too-big");
    return { data: await pdfToBase64(file), mimeType: "application/pdf" };
  }
  return { data: await toBase64Jpeg(file), mimeType: "image/jpeg" };
}

/**
 * Compress a screenshot and send it to the parse-capture edge function.
 * One AI call per image; returns the parsed transaction for review (never saves).
 */
export async function parseScreenshot(
  file: File,
  categoryNames: string[]
): Promise<CaptureResult> {
  let payload: { data: string; mimeType: string };
  try {
    payload = await toPayload(file);
  } catch (e) {
    return {
      ok: false,
      error:
        (e as Error)?.message === "pdf-too-big"
          ? "That PDF is too large (max 10 MB)."
          : "Couldn’t read that file.",
    };
  }

  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke("parse-capture", {
    body: {
      kind: "screenshot",
      image: payload.data,
      mimeType: payload.mimeType,
      categories: categoryNames,
    },
  });

  if (error) {
    // supabase-js wraps non-2xx; try to read a structured body.
    const ctx = (error as { context?: Response }).context;
    if (ctx) {
      try {
        const b = await ctx.json();
        if (b?.code === "QUOTA")
          return {
            ok: false,
            quota: true,
            error: "Daily scan limit reached — enter it manually.",
          };
        if (b?.error) return { ok: false, error: b.error };
      } catch {
        /* fall through */
      }
    }
    return { ok: false, error: "Scan failed. Try again or enter manually." };
  }

  const parsed = (data as { parsed?: ParsedCapture })?.parsed;
  if (!parsed) return { ok: false, error: "Couldn’t read that image." };
  return { ok: true, parsed };
}
