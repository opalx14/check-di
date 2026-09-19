import { cookies } from "next/headers";

import { I18N_COOKIE_KEY } from "@/lib/i18n/constants";
import enJson from "@/lib/i18n/locales/en.json";
import viJson from "@/lib/i18n/locales/vi.json";
import type { Dictionary, Locale } from "@/lib/i18n/types";

const dictionaries: Record<Locale, Dictionary> = {
  vi: viJson as Dictionary,
  en: enJson as Dictionary,
};

export async function getServerLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(I18N_COOKIE_KEY)?.value;
  return value === "en" ? "en" : "vi";
}

export async function getServerDictionary() {
  const locale = await getServerLocale();
  return {
    locale,
    dict: dictionaries[locale],
  };
}
