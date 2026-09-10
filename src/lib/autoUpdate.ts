const UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000;

export function setupAutoUpdate(): void {
  if (!("serviceWorker" in navigator)) return;

  // controllerchange fires both when a brand-new service worker claims an
  // until-now-uncontrolled page (first visit/install -- there's nothing
  // stale to refresh, the page already has the code this worker just
  // started serving) and when an update replaces an already-active worker
  // (there IS something to refresh). Reloading unconditionally on the first
  // case interrupts whatever the page was doing mid-load -- e.g. the splash
  // screen's fade-out timer -- for no reason. Only reload starting from the
  // second controllerchange onward.
  let hasController = Boolean(navigator.serviceWorker.controller);
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) return;
    if (!hasController) {
      hasController = true;
      return;
    }
    reloading = true;
    window.location.reload();
  });

  navigator.serviceWorker.ready.then((registration) => {
    setInterval(() => {
      registration.update().catch(() => {});
    }, UPDATE_CHECK_INTERVAL_MS);
  });
}
