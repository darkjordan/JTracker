import { createClient } from "@/lib/supabase/client";
import { inspectPdf, looksLikePdf, looksScanned, type PdfInfo } from "@/lib/pdf";

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
// Base64 inflates by 4/3 and the whole thing travels as one JSON string, so a
// 5 MB PDF is already a ~6.7 MB request body — the practical ceiling before the
// edge function rejects it with a bare 400. Statements are far smaller than this.
const MAX_PDF_BYTES = 5 * 1024 * 1024;

function isPdf(file: File): boolean {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

/** Errors thrown by the preflight, mapped to copy at the call site. */
type PdfProblem = "pdf-too-big" | "pdf-encrypted" | "pdf-invalid";

const PDF_MESSAGES: Record<PdfProblem, string> = {
  "pdf-too-big": "That PDF is too large (max 5 MB). Try splitting it by month.",
  "pdf-encrypted":
    "That PDF is password-protected, so nothing can be read from it. Open it with your password, re-save/print it as a new PDF without one, then import that.",
  "pdf-invalid": "That file isn’t a readable PDF.",
};

function pdfMessage(e: unknown): string {
  const m = (e as Error)?.message as PdfProblem;
  return PDF_MESSAGES[m] ?? "Couldn’t read that file.";
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

/**
 * Validate a PDF and base64-encode it, in chunks to avoid an argument overflow.
 * Throws a PdfProblem so we never burn an AI call on a file that cannot be read.
 */
async function readPdf(file: File): Promise<{ b64: string; info: PdfInfo }> {
  if (file.size > MAX_PDF_BYTES) throw new Error("pdf-too-big" satisfies PdfProblem);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!looksLikePdf(bytes)) throw new Error("pdf-invalid" satisfies PdfProblem);
  const info = inspectPdf(bytes);
  if (info.encrypted) throw new Error("pdf-encrypted" satisfies PdfProblem);

  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return { b64: btoa(binary), info };
}

/** Turn any supported file into { data, mimeType } for the edge function. */
async function toPayload(
  file: File
): Promise<{ data: string; mimeType: string }> {
  if (isPdf(file)) {
    const { b64 } = await readPdf(file);
    return { data: b64, mimeType: "application/pdf" };
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
    return { ok: false, error: pdfMessage(e) };
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

export type StatementRow = {
  date: string;
  description: string;
  amount: number;
  direction: "debit" | "credit";
  /** Free text from the model — resolve via matchCategoryId, never trust directly. */
  suggested_category?: string;
};
export type StatementParse = {
  rows: StatementRow[];
  statement_start?: string;
  statement_end?: string;
  opening_balance?: number;
  closing_balance?: number;
};
export type StatementResult =
  | { ok: true; data: StatementParse; pdf: PdfInfo }
  | { ok: false; error: string; quota?: boolean };

/**
 * Explain a statement the model read but found nothing in. `rows: []` is a
 * schema-valid answer, so without this the user just gets an empty sheet.
 * The usual cause is a partial statement: page 1 of a credit-card statement is
 * a summary (balance, limit, due date) and genuinely lists no transactions.
 */
export function emptyStatementReason(pdf: PdfInfo): string {
  const parts = ["No transactions found in that PDF."];
  if (pdf.pageCount === 1)
    parts.push(
      "It's a single page — a statement's first page is usually just the summary (balance, credit limit, due date), and the transactions are listed on the later pages. Import the whole statement, not page 1."
    );
  else
    parts.push(
      "Check it's the statement's transaction listing — a summary page or advice slip has no rows to import."
    );
  if (looksScanned(pdf))
    parts.push(
      "It's also a scan or photo, which reads far less reliably than the original PDF from your banking app."
    );
  return parts.join(" ");
}

/**
 * Parse a whole bank-statement PDF into rows + balances (one AI call).
 * `categoryNames` rides along in that same call so rows come back categorised
 * without costing anything extra — SPEC §5 bars a call per row, not this.
 */
export async function parseStatement(
  file: File,
  categoryNames: string[] = []
): Promise<StatementResult> {
  if (!isPdf(file)) return { ok: false, error: "Please choose a PDF statement." };
  let b64: string;
  let info: PdfInfo;
  try {
    ({ b64, info } = await readPdf(file));
  } catch (e) {
    return { ok: false, error: pdfMessage(e) };
  }

  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke("parse-capture", {
    body: {
      kind: "statement",
      image: b64,
      mimeType: "application/pdf",
      categories: categoryNames,
    },
  });

  if (error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx) {
      try {
        const b = await ctx.json();
        if (b?.code === "QUOTA")
          return { ok: false, quota: true, error: "Daily AI limit reached." };
        if (b?.error) return { ok: false, error: b.error };
      } catch {
        /* fall through */
      }
    }
    return { ok: false, error: "Import failed. Try again." };
  }

  const parsed = (data as { parsed?: StatementParse })?.parsed;
  if (!parsed?.rows) return { ok: false, error: "Couldn’t read that statement." };
  return { ok: true, data: parsed, pdf: info };
}
