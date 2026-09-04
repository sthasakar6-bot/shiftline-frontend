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
  // flags. Path data below is the real official flag artwork (moon and sun
  // included), cropped to the pennant's own bounding box.
  return (
    <svg viewBox="0 0 380 480" style={{ ...style, width: (size * 5) / 6 }} aria-hidden="true">
      <g transform="translate(0 15)scale(.9375)">
        <path
          fill="#ce0000"
          stroke="#000063"
          strokeWidth="13.8"
          d="M6.5 489.5h378.8L137.4 238.1l257.3.3L6.6-9.5v499z"
        />
        <path
          fill="#fff"
          d="m180.7 355.8-27 9 21.2 19.8-28.5-1.8 11.7 26.2-25.5-12.3.5 28.6-18.8-20.9-10.7 26.6-9.2-26.3-20.3 20.6 1.8-27.7L49 409l12.6-25-29.3.6 21.5-18.3-27.3-10.5 27-9L32.2 327l28.4 1.8L49 302.6l25.6 12.3-.5-28.6 18.8 20.9 10.7-26.6 9.1 26.3 20.4-20.6-1.9 27.7 27-11.4-12.7 25 29.4-.6-21.5 18.3zm-32.4-184.7-11.3 8.4 5.6 4.6a94 94 0 0 0 30.7-36c1.8 21.3-17.7 69-68.7 69.5a70.6 70.6 0 0 1-71.5-70.3c10 18.2 16.2 27 32 36.5l4.7-4.4-10.6-8.9 13.7-3.6-7.4-12.4 14.4 1-1.8-14.4 12.6 7.4 4-13.5 9 10.8 8.5-10.3 4.6 14 11.8-8.2-1.5 14.3 14.2-1.7-6.7 13.2z"
        />
      </g>
    </svg>
  );
}
