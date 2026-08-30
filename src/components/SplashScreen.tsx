import { useEffect, useState } from "react";

const SESSION_KEY = "shiftline_splash_shown";
const HOLD_MS = 1600;
const FADE_MS = 500;

type Phase = "hidden" | "visible" | "leaving";

function getInitialPhase(): Phase {
  if (typeof window === "undefined") return "hidden";
  if (sessionStorage.getItem(SESSION_KEY)) return "hidden";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    sessionStorage.setItem(SESSION_KEY, "1");
    return "hidden";
  }
  return "visible";
}

export default function SplashScreen() {
  const [phase, setPhase] = useState<Phase>(getInitialPhase);

  useEffect(() => {
    if (phase !== "visible") return;
    const timer = setTimeout(() => setPhase("leaving"), HOLD_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "leaving") return;
    sessionStorage.setItem(SESSION_KEY, "1");
    const timer = setTimeout(() => setPhase("hidden"), FADE_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  if (phase === "hidden") return null;

  return (
    <div className={`splash-screen${phase === "leaving" ? " leaving" : ""}`}>
      <div className="splash-glow" />
      <img src="/icon-192.png" alt="Shiftline" className="splash-logo" />
      <div className="splash-name">Shiftline</div>
      <div className="splash-slogan">Every shift. Right on time.</div>
    </div>
  );
}
