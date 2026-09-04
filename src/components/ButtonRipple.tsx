import { useEffect } from "react";

// Injects a ripple span into whichever <button> was pressed, positioned at
// the pointer, and lets the CSS animation (`.btn-ripple`) play it out and
// self-remove. Delegated at the document level so every button in the app
// gets the effect without each component needing to opt in.
export default function ButtonRipple() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    function handlePointerDown(e: PointerEvent) {
      const target = (e.target as HTMLElement | null)?.closest("button");
      if (!target || target.hasAttribute("disabled")) return;

      const rect = target.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.6;
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      const ripple = document.createElement("span");
      ripple.className = "btn-ripple";
      ripple.style.width = `${size}px`;
      ripple.style.height = `${size}px`;
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      target.appendChild(ripple);
      ripple.addEventListener("animationend", () => ripple.remove());
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return null;
}
