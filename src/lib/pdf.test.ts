import { describe, expect, it } from "vitest";
import { inspectPdf, looksLikePdf, looksScanned } from "./pdf";

const bytes = (s: string): Uint8Array =>
  Uint8Array.from([...s].map((c) => c.charCodeAt(0)));

const PLAIN = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Resources << /Font << /F1 5 0 R >> >> >> endobj
trailer << /Root 1 0 R /Size 6 >>
%%EOF`;

// What a Maybank/CIMB e-statement looks like: same structure, plus an
// encryption dictionary referenced from the trailer.
const ENCRYPTED = `%PDF-1.6
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
3 0 obj << /Type /Page >> endobj
9 0 obj << /Filter /Standard /V 2 /R 3 /Length 128 /EncryptMetadata true >> endobj
trailer << /Root 1 0 R /Encrypt 9 0 R /Size 10 >>
%%EOF`;

// The shape of the real RHB statement that triggered this: one page, two
// full-page rasters, and a font used only for the CamScanner watermark.
const SCANNED = `%PDF-1.7
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
3 0 obj << /Type /Page /Resources << /Font << /F1 5 0 R >> /XObject << /X1 6 0 R /X2 7 0 R >> >> >> endobj
6 0 obj << /Type /XObject /Subtype /Image /Width 234 /Height 234 >> stream
endstream endobj
7 0 obj << /Type /XObject /Subtype /Image /Width 1188 /Height 1692 >> stream
endstream endobj
trailer << /Root 1 0 R >>
%%EOF`;

describe("looksLikePdf", () => {
  it("accepts the %PDF- magic number", () => {
    expect(looksLikePdf(bytes(PLAIN))).toBe(true);
  });

  it("rejects a JPEG passed off as a PDF", () => {
    expect(looksLikePdf(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00]))).toBe(false);
  });

  it("rejects an empty file without throwing", () => {
    expect(looksLikePdf(new Uint8Array())).toBe(false);
  });
});

describe("inspectPdf", () => {
  it("flags a password-protected statement", () => {
    expect(inspectPdf(bytes(ENCRYPTED)).encrypted).toBe(true);
  });

  it("does not flag an ordinary PDF", () => {
    expect(inspectPdf(bytes(PLAIN)).encrypted).toBe(false);
  });

  it("does not mistake /EncryptMetadata alone for encryption", () => {
    const noTrailerEncrypt = `%PDF-1.6
5 0 obj << /EncryptMetadata false >> endobj
trailer << /Root 1 0 R >>`;
    expect(inspectPdf(bytes(noTrailerEncrypt)).encrypted).toBe(false);
  });

  it("counts pages without counting /Type /Pages", () => {
    expect(inspectPdf(bytes(PLAIN)).pageCount).toBe(1);
  });

  it("detects font resources", () => {
    expect(inspectPdf(bytes(PLAIN)).hasFonts).toBe(true);
  });

  it("counts embedded images", () => {
    expect(inspectPdf(bytes(SCANNED)).imageCount).toBe(2);
    expect(inspectPdf(bytes(PLAIN)).imageCount).toBe(0);
  });

  it("handles a file larger than the 32k chunk size", () => {
    const big = `%PDF-1.4\n${"% padding\n".repeat(20000)}trailer << /Encrypt 9 0 R >>`;
    expect(inspectPdf(bytes(big)).encrypted).toBe(true);
  });
});

describe("looksScanned", () => {
  it("flags a CamScanner-style page despite its watermark font", () => {
    const info = inspectPdf(bytes(SCANNED));
    expect(info.hasFonts).toBe(true); // the watermark — why fonts prove nothing
    expect(looksScanned(info)).toBe(true);
  });

  it("does not flag a real e-statement", () => {
    expect(looksScanned(inspectPdf(bytes(PLAIN)))).toBe(false);
  });

  it("does not flag a text statement carrying a small logo", () => {
    const withLogo = `%PDF-1.4
3 0 obj << /Type /Page >> endobj
3 0 obj << /Type /Page >> endobj
3 0 obj << /Type /Page >> endobj
8 0 obj << /Type /XObject /Subtype /Image /Width 60 /Height 60 >> endobj
trailer << /Root 1 0 R >>`;
    expect(looksScanned(inspectPdf(bytes(withLogo)))).toBe(false);
  });
});
