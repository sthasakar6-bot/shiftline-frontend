import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { setLanguage, SUPPORTED_LANGUAGES, type SupportedLanguage } from "../i18n";

const FLAGS: Record<SupportedLanguage, string> = {
  en: "🇬🇧",
  ne: "🇳🇵",
  nl: "🇳🇱",
};

const NAME_KEYS: Record<SupportedLanguage, string> = {
  en: "language.english",
  ne: "language.nepali",
  nl: "language.dutch",
};

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = (i18n.language?.slice(0, 2) as SupportedLanguage) || "en";

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="lang-switcher" ref={ref}>
      <button
        type="button"
        className="lang-switcher-trigger"
        onClick={() => setOpen(!open)}
        title={t("language.label")}
      >
        <span className="lang-flag">{FLAGS[current] ?? FLAGS.en}</span>
      </button>
      {open && (
        <div className="lang-switcher-menu">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang}
              className={lang === current ? "active" : ""}
              onClick={() => {
                setLanguage(lang);
                setOpen(false);
              }}
            >
              <span className="lang-flag">{FLAGS[lang]}</span>
              {t(NAME_KEYS[lang])}
              {lang === current && <Check size={15} className="lang-check" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
