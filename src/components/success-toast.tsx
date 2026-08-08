"use client";

import { useEffect } from "react";

const DURATION_MS = 1800;

// Brief confirmation toast — a checkmark pop + auto-dismiss — shown after a
// transaction is saved (quick entry, scan, or statement import).
export default function SuccessToast({
  message,
  onDone,
}: {
  message: string;
  onDone: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, DURATION_MS);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-30 flex justify-center px-4">
      <div className="animate-toast flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
        <span className="animate-toast-check flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs">
          ✓
        </span>
        {message}
      </div>
    </div>
  );
}
