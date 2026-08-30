import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { enablePushNotifications, isPushSupported } from "../lib/push";
import { getCurrentCoords } from "../lib/geolocation";

function storageKey(userId: number) {
  return `shiftline_onboarded_${userId}`;
}

export default function OnboardingPrompt() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    try {
      if (!localStorage.getItem(storageKey(user.id))) {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable (private mode, etc.) -- just skip onboarding.
    }
  }, [user]);

  function dismiss() {
    if (user) {
      try {
        localStorage.setItem(storageKey(user.id), "1");
      } catch {
        // ignore
      }
    }
    setVisible(false);
  }

  async function handleEnable() {
    setBusy(true);
    try {
      if (isPushSupported()) {
        await enablePushNotifications().catch(() => {});
      }
      // Discarded -- this call exists only to trigger the location permission
      // prompt now instead of the first time they try to clock in/out.
      await getCurrentCoords();
    } finally {
      setBusy(false);
      dismiss();
    }
  }

  if (!visible) return null;

  return (
    <div className="modal-overlay" onClick={dismiss}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Stay in the loop</h3>
        <p>
          Turn on notifications so you know right away when a shift is assigned, and allow
          location so clock-in/out can record where you were. You can change either later from
          your profile menu.
        </p>
        <div className="modal-actions">
          <button onClick={dismiss}>Not now</button>
          <button onClick={handleEnable} disabled={busy}>
            {busy ? "Requesting..." : "Enable"}
          </button>
        </div>
      </div>
    </div>
  );
}
