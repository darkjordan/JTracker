"use client";

import { useEffect, useRef, useState } from "react";
import { parseScreenshot, type ParsedCapture } from "@/lib/capture";
import CaptureReview from "./capture-review";
import { useI18n } from "@/lib/i18n-client";
import type { Category } from "@/lib/api/types";
import type { ReliefRow } from "@/lib/relief";

// Scan a receipt/screenshot → one AI call → review sheet → save. `autoFile`
// lets a caller (the share_target handoff on the Dashboard) feed in a file
// that didn't come from the picker, reusing this same pipeline rather than
// building a second one.
export default function ScanButton({
  categories,
  reliefs,
  onSaved,
  autoFile,
  onAutoFileHandled,
}: {
  categories: Category[];
  reliefs: ReliefRow[];
  onSaved: () => void;
  autoFile?: File | null;
  onAutoFileHandled?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<ParsedCapture | null>(null);
  const { t } = useI18n();

  async function handleFile(file: File) {
    setError(null);
    setBusy(true);
    const names = [...new Set(categories.map((c) => c.name))];
    const res = await parseScreenshot(file, names);
    setBusy(false);
    if (res.ok) setReview(res.parsed);
    else setError(res.error);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await handleFile(file);
  }

  useEffect(() => {
    if (!autoFile) return;
    (async () => {
      await handleFile(autoFile);
      onAutoFileHandled?.();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFile]);

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 py-2.5 text-sm font-semibold text-indigo-700 disabled:opacity-60"
      >
        {busy ? t("entry.scanning") : t("entry.scanReceipt")}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={onFile}
        className="hidden"
      />
      {error && <p className="mt-1 px-1 text-xs text-red-600">{error}</p>}
      {review && (
        <CaptureReview
          parsed={review}
          categories={categories}
          reliefs={reliefs}
          onClose={() => setReview(null)}
          onSaved={onSaved}
        />
      )}
    </>
  );
}
