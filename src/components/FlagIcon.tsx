import type { SupportedLanguage } from "../i18n";

export default function FlagIcon({ lang, size = 18 }: { lang: SupportedLanguage; size?: number }) {
  const style = { width: size, height: (size * 3) / 4, borderRadius: 2, flexShrink: 0 };

  if (lang === "en") {
    return (
      <svg viewBox="0 0 24 18" style={style} aria-hidden="true">
        <rect width="24" height="18" fill="#00247d" />
        <path d="M0,0 L24,18 M24,0 L0,18" stroke="#fff" strokeWidth="3.6" />
        <path d="M0,0 L24,18 M24,0 L0,18" stroke="#cf142b" strokeWidth="1.4" />
        <path d="M12,0 V18 M0,9 H24" stroke="#fff" strokeWidth="6" />
        <path d="M12,0 V18 M0,9 H24" stroke="#cf142b" strokeWidth="2.6" />
      </svg>
    );
  }

  if (lang === "nl") {
    return (
      <svg viewBox="0 0 24 18" style={style} aria-hidden="true">
        <rect width="24" height="6" y="0" fill="#AE1C28" />
        <rect width="24" height="6" y="6" fill="#fff" />
        <rect width="24" height="6" y="12" fill="#21468B" />
      </svg>
    );
  }

  // Nepal: not a rectangle, so give it its own taller viewBox rather than
  // forcing the crimson double-pennant into a 4:3 box like the other two
  // flags. The moon (upper pennant) and sun (lower pennant) are what
  // actually make it read as Nepal's flag, not just the pennant outline.
  return (
    <svg viewBox="0 0 20 24" style={{ ...style, width: (size * 5) / 6 }} aria-hidden="true">
      <path
        d="M0,0 L20,8.4 L10,13.2 L17,19.2 L0,24 Z"
        fill="#DC143C"
        stroke="#003893"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="6.6" cy="6.2" r="2" fill="#fff" />
      <circle cx="7.8" cy="5.3" r="1.7" fill="#DC143C" />
      <circle cx="8.8" cy="17.2" r="2.6" fill="#fff" />
    </svg>
  );
}
