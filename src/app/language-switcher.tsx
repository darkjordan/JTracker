"use client";

import { LANGS } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n-client";

export default function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  return (
    <div className="inline-flex rounded-lg bg-gray-100 p-0.5 text-xs">
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLang(l.code)}
          className={`rounded-md px-2 py-1 font-medium transition ${
            lang === l.code
              ? "bg-white text-indigo-700 shadow-sm"
              : "text-gray-500"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
