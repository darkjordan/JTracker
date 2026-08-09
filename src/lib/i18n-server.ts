import { cookies } from "next/headers";
import { getT, normalizeLang, type Lang, type TFn } from "./i18n";

export async function getLang(): Promise<Lang> {
  const store = await cookies();
  return normalizeLang(store.get("lang")?.value);
}

export async function getServerT(): Promise<TFn> {
  return getT(await getLang());
}
