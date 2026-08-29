import i18n from "i18next";
import viJson from "./locales/vi.json";
import enJson from "./locales/en.json";

export const defaultNS = "translation";
export const resources = {
  vi: { translation: viJson },
  en: { translation: enJson },
} as const;

if (!i18n.isInitialized) {
  i18n.init({
    resources,
    lng: "vi",
    fallbackLng: "vi",
    defaultNS,
    interpolation: {
      escapeValue: false,
    },
  });
}

export default i18n;
