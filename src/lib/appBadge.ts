export function updateAppBadge(unreadCount: number): void {
  const nav = navigator as Navigator & {
    setAppBadge?: (count?: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  };
  try {
    if (unreadCount > 0) {
      nav.setAppBadge?.(unreadCount)?.catch(() => {});
    } else {
      nav.clearAppBadge?.()?.catch(() => {});
    }
  } catch {
    // Badging API unsupported in this browser.
  }
}
