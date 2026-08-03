// Cheap, dependency-free PDF preflight — runs BEFORE we spend an AI call.
// A password-protected statement is the #1 reason Gemini returns zero rows:
// every Malaysian bank e-statement (Maybank, CIMB, Public Bank, RHB…) ships
// encrypted by default, and an encrypted PDF has no readable content stream,
// so the model sees an empty document and answers `{ rows: [] }` — no error,
// no rows, ~4s latency. Catching it here turns that silence into a fix-it message.

export type PdfInfo = {
  /** Trailer declares /Encrypt — content is unreadable without the password. */
  encrypted: boolean;
  /** Rough page count from /Type /Page occurrences (0 if it can't be read). */
  pageCount: number;
  /** Embedded raster images — roughly one per page in a scanned document. */
  imageCount: number;
  /**
   * Any font resource at all. Note a scanner watermark ("CamScanner") counts,
   * so this proves nothing on its own — use `looksScanned` for that call.
   */
  hasFonts: boolean;
};

/**
 * `/Encrypt 12 0 R` in the trailer (or xref-stream dict) marks a protected PDF.
 * Both are stored uncompressed, so a plain byte scan finds them. The delimiter
 * class avoids matching `/EncryptMetadata`, which only ever appears alongside a
 * real `/Encrypt` entry anyway.
 */
const ENCRYPT_RE = /\/Encrypt[\s\d[<]/;
const PAGE_RE = /\/Type\s*\/Page[^s]/g;
const FONT_RE = /\/(Font|FontFile\d?)[\s/[<]/;
const IMAGE_RE = /\/Subtype\s*\/Image/g;

/** Decode bytes as latin1 so every byte maps to one char (never throws). */
function toLatin1(bytes: Uint8Array): string {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return s;
}

export function inspectPdf(bytes: Uint8Array): PdfInfo {
  const text = toLatin1(bytes);
  return {
    encrypted: ENCRYPT_RE.test(text),
    pageCount: text.match(PAGE_RE)?.length ?? 0,
    imageCount: text.match(IMAGE_RE)?.length ?? 0,
    hasFonts: FONT_RE.test(text),
  };
}

/**
 * A photographed/scanned statement carries at least one full-page raster per
 * page. Real e-statements draw their tables with text and embed no images
 * beyond a small logo, so an image-per-page ratio is the usable signal —
 * checking for fonts is not, since scanner apps stamp a text watermark on.
 */
export function looksScanned(info: PdfInfo): boolean {
  return info.imageCount > 0 && info.imageCount >= info.pageCount;
}

/** True when the leading bytes are the `%PDF-` magic number. */
export function looksLikePdf(bytes: Uint8Array): boolean {
  return (
    bytes[0] === 0x25 && // %
    bytes[1] === 0x50 && // P
    bytes[2] === 0x44 && // D
    bytes[3] === 0x46 && // F
    bytes[4] === 0x2d //   -
  );
}
