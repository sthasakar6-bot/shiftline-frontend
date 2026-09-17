export type ThemeChoice = "light" | "dark";

const KEY = "shiftline-theme";

export function getStoredTheme(): ThemeChoice | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

export function getSystemTheme(): ThemeChoice {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getEffectiveTheme(): ThemeChoice {
  return getStoredTheme() ?? getSystemTheme();
}

export function applyTheme(theme: ThemeChoice): void {
  document.documentElement.setAttribute("data-theme", theme);
}

export function setTheme(theme: ThemeChoice): void {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // Ignore -- private browsing / storage disabled. The choice just
    // won't persist across reloads.
  }
  applyTheme(theme);
}

// Applies the stored choice (or the system preference) as early as
// possible so the page never flashes the "wrong" theme on load.
export function initTheme(): void {
  applyTheme(getEffectiveTheme());
}

// Keeps the page in sync with the phone/OS setting live: if the person
// hasn't explicitly picked light or dark in the app, switching the
// system theme (even without reloading) updates the app immediately.
// A manual choice from the toggle still wins over this.
export function watchSystemTheme(): void {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", (e) => {
    if (getStoredTheme()) return; // an explicit choice takes precedence
    applyTheme(e.matches ? "dark" : "light");
  });
}
