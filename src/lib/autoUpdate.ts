const UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000;

export function setupAutoUpdate(): void {
  if (!("serviceWorker" in navigator)) return;

  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });

  navigator.serviceWorker.ready.then((registration) => {
    setInterval(() => {
      registration.update().catch(() => {});
    }, UPDATE_CHECK_INTERVAL_MS);
  });
}
