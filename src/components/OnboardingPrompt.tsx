import { useEffect, useState } from "react";
import { Share, PlusSquare } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { enablePushNotifications, isPushSupported } from "../lib/push";
import { getCurrentCoords } from "../lib/geolocation";
import { isIos, isStandalone } from "../lib/platform";
import { getDeferredInstallPrompt, clearDeferredInstallPrompt } from "../lib/installPrompt";

function storageKey(userId: number) {
  return `shiftline_onboarded_${userId}`;
}

type Step = "install-android" | "install-ios" | "permissions";

export default function OnboardingPrompt() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<Step>("permissions");

  useEffect(() => {
    if (!user) return;
    try {
      if (!localStorage.getItem(storageKey(user.id))) {
        if (!isStandalone() && getDeferredInstallPrompt()) {
          setStep("install-android");
        } else if (!isStandalone() && isIos()) {
          setStep("install-ios");
        } else {
          setStep("permissions");
        }
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

  async function handleInstall() {
    const prompt = getDeferredInstallPrompt();
    if (!prompt) {
      setStep("permissions");
      return;
    }
    setBusy(true);
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch {
      // ignore -- move on to the permissions step either way
    } finally {
      clearDeferredInstallPrompt();
      setBusy(false);
      setStep("permissions");
    }
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

  if (step === "install-android") {
    return (
      <div className="modal-overlay" onClick={dismiss}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <h3>Add Shiftline to your Home Screen</h3>
          <p>
            Install Shiftline as an app for quick access, offline support, and notifications that
            work like any other app on your phone.
          </p>
          <div className="modal-actions">
            <button onClick={() => setStep("permissions")}>Not now</button>
            <button onClick={handleInstall} disabled={busy}>
              {busy ? "Installing..." : "Install"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "install-ios") {
    return (
      <div className="modal-overlay" onClick={() => setStep("permissions")}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <h3>Add Shiftline to your Home Screen</h3>
          <p>For quick access and notifications, add Shiftline to your Home Screen:</p>
          <ol className="install-steps">
            <li>
              Tap the Share icon <Share size={14} className="install-step-icon" /> in Safari's
              toolbar
            </li>
            <li>
              Scroll down and tap <strong>Add to Home Screen</strong>{" "}
              <PlusSquare size={14} className="install-step-icon" />
            </li>
          </ol>
          <div className="modal-actions">
            <button onClick={() => setStep("permissions")}>Got it</button>
          </div>
        </div>
      </div>
    );
  }

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
