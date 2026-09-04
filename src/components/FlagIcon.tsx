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

  // Nepal: not a rectangle, so give it its own square-ish viewBox rather than
  // forcing the crimson pennant into a 4:3 box like the other two flags.
  return (
    <svg viewBox="0 0 18 20" style={{ ...style, width: (size * 3) / 4 }} aria-hidden="true">
      <path
        d="M2,1 L2,19 L11,13 L11,19 L17,8 L9,1.5 L9,7 Z"
        fill="#DC143C"
        stroke="#003893"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
