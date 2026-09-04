import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en";
import ne from "./ne";
import nl from "./nl";

export const LANGUAGE_KEY = "shiftline_language";
export const SUPPORTED_LANGUAGES = ["en", "ne", "nl"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

function detectLanguage(): SupportedLanguage {
  const stored = localStorage.getItem(LANGUAGE_KEY);
  if (stored && (SUPPORTED_LANGUAGES as readonly string[]).includes(stored)) {
    return stored as SupportedLanguage;
  }
  const browser = navigator.language.slice(0, 2);
  if ((SUPPORTED_LANGUAGES as readonly string[]).includes(browser)) {
    return browser as SupportedLanguage;
  }
  return "en";
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ne: { translation: ne },
    nl: { translation: nl },
  },
  lng: detectLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export function setLanguage(lang: SupportedLanguage): void {
  localStorage.setItem(LANGUAGE_KEY, lang);
  i18n.changeLanguage(lang);
}

const DATE_LOCALES: Record<SupportedLanguage, string> = {
  en: "en-US",
  ne: "ne-NP",
  nl: "nl-NL",
};

export function getDateLocale(): string {
  const lang = (i18n.language?.slice(0, 2) as SupportedLanguage) || "en";
  return DATE_LOCALES[lang] ?? DATE_LOCALES.en;
}

export default i18n;
