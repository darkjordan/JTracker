"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { getT, type Lang, type TFn } from "./i18n";

type Ctx = { lang: Lang; t: TFn; setLang: (l: Lang) => void };

const I18nContext = createContext<Ctx | null>(null);

export function LanguageProvider({
  lang: initial,
  children,
}: {
  lang: Lang;
  children: ReactNode;
}) {
  const [lang, setLangState] = useState<Lang>(initial);
  const router = useRouter();

  const setLang = useCallback(
    (l: Lang) => {
      setLangState(l);
      document.cookie = `lang=${l}; path=/; max-age=31536000; samesite=lax`;
      try {
        localStorage.setItem("jtracker:lang", l);
      } catch {
        /* ignore storage failures (private mode) */
      }
      router.refresh();
    },
    [router]
  );

  return (
    <I18nContext.Provider value={{ lang, t: getT(lang), setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within LanguageProvider");
  return ctx;
}
