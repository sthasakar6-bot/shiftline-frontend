export function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

// Chrome on iOS is required to use Apple's WebKit engine, but its own
// "Add to Home Screen" (in its menu, not the iOS share sheet) doesn't read
// the page's icon the way Safari's does -- it creates a shortcut with no
// custom icon. Detected via the "CriOS" UA token Chrome uses on iOS instead
// of "Chrome" (which iOS Safari itself never includes).
export function isChromeIos(): boolean {
  return isIos() && /CriOS/i.test(navigator.userAgent);
}

export function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
