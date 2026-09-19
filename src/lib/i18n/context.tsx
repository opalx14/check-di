"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import i18n from "./config";
import viJson from "./locales/vi.json";
import enJson from "./locales/en.json";
import {
  I18N_COOKIE_KEY,
  I18N_COOKIE_MAX_AGE_SECONDS,
  I18N_STORAGE_KEY,
} from "./constants";
import { Dictionary, Locale } from "./types";

type I18nContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  dict: Dictionary;
  t: (key: string, options?: Record<string, unknown>) => string;
};

const dictionaries: Record<Locale, Dictionary> = {
  vi: viJson as Dictionary,
  en: enJson as Dictionary,
};

function persistLocale(locale: Locale) {
  localStorage.setItem(I18N_STORAGE_KEY, locale);
  document.cookie = `${I18N_COOKIE_KEY}=${locale}; path=/; max-age=${I18N_COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
}

function readCookieLocale(): Locale | null {
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${I18N_COOKIE_KEY}=`));
  const value = match?.split("=")[1];
  return value === "vi" || value === "en" ? value : null;
}

const I18nContext = createContext<I18nContextType>({
  locale: "vi",
  setLocale: () => {},
  dict: viJson as Dictionary,
  t: (key: string) => key,
});

export function I18nProvider({
  children,
  initialLocale = "vi",
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    i18n.changeLanguage(initialLocale);
    document.documentElement.lang = initialLocale;

    try {
      const storedLocale = localStorage.getItem(I18N_STORAGE_KEY) as Locale | null;
      const savedLocale =
        storedLocale === "vi" || storedLocale === "en"
          ? storedLocale
          : readCookieLocale();
      if (savedLocale === "vi" || savedLocale === "en") {
        setLocaleState(savedLocale);
        i18n.changeLanguage(savedLocale);
        document.documentElement.lang = savedLocale;
        persistLocale(savedLocale);
      } else {
        document.documentElement.lang = initialLocale;
        persistLocale(initialLocale);
      }
    } catch {
      // Ignore localStorage access errors
    }
  }, [initialLocale]);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      persistLocale(newLocale);
      i18n.changeLanguage(newLocale);
      document.documentElement.lang = newLocale;
    } catch {
      // Ignore localStorage access errors
    }
  };

  const dict = dictionaries[locale] || (viJson as Dictionary);
  const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, options);

  return (
    <I18nContext.Provider value={{ locale, setLocale, dict, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}
