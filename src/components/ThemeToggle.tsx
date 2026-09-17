import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getEffectiveTheme, setTheme, type ThemeChoice } from "../lib/theme";

export default function ThemeToggle() {
  const { t } = useTranslation();
  const [theme, setThemeState] = useState<ThemeChoice>("light");

  useEffect(() => {
    setThemeState(getEffectiveTheme());
  }, []);

  function toggle() {
    const next: ThemeChoice = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setThemeState(next);
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      title={theme === "dark" ? t("theme.switchToLight") : t("theme.switchToDark")}
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
