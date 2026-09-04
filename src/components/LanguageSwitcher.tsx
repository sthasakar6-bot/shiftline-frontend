import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { setLanguage, SUPPORTED_LANGUAGES, type SupportedLanguage } from "../i18n";
import FlagIcon from "./FlagIcon";

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
        <FlagIcon lang={current} size={19} />
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
              <FlagIcon lang={lang} size={19} />
              {t(NAME_KEYS[lang])}
              {lang === current && <Check size={15} className="lang-check" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
