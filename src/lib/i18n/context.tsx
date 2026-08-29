"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import i18n from "./config";
import viJson from "./locales/vi.json";
import enJson from "./locales/en.json";
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

const STORAGE_KEY = "check_di_locale";

const I18nContext = createContext<I18nContextType>({
  locale: "vi",
  setLocale: () => {},
  dict: viJson as Dictionary,
  t: (key: string) => key,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("vi");

  useEffect(() => {
    try {
      const savedLocale = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (savedLocale === "vi" || savedLocale === "en") {
        setLocaleState(savedLocale);
        i18n.changeLanguage(savedLocale);
        document.documentElement.lang = savedLocale;
      } else {
        document.documentElement.lang = "vi";
      }
    } catch {
      // Ignore localStorage access errors
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
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
