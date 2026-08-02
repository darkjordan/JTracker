"use client";

import { useRef, useState } from "react";
import { parseScreenshot, type ParsedCapture } from "@/lib/capture";
import CaptureReview from "./capture-review";
import type { Category } from "@/lib/api/types";

// Scan a receipt/screenshot → one AI call → review sheet → save.
export default function ScanButton({
  categories,
  onSaved,
}: {
  categories: Category[];
  onSaved: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<ParsedCapture | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setBusy(true);
    const names = [...new Set(categories.map((c) => c.name))];
    const res = await parseScreenshot(file, names);
    setBusy(false);
    if (res.ok) setReview(res.parsed);
    else setError(res.error);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 py-2.5 text-sm font-semibold text-indigo-700 disabled:opacity-60"
      >
        {busy ? "Scanning…" : "📷 Scan a receipt / screenshot"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onFile}
        className="hidden"
      />
      {error && <p className="mt-1 px-1 text-xs text-red-600">{error}</p>}
      {review && (
        <CaptureReview
          parsed={review}
          categories={categories}
          onClose={() => setReview(null)}
          onSaved={onSaved}
        />
      )}
    </>
  );
}
