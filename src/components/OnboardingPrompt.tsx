import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
          <h3>{t("onboarding.addToHomeScreen")}</h3>
          <p>{t("onboarding.installBody")}</p>
          <div className="modal-actions">
            <button onClick={() => setStep("permissions")}>{t("onboarding.notNow")}</button>
            <button onClick={handleInstall} disabled={busy}>
              {busy ? t("onboarding.installing") : t("onboarding.install")}
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
          <h3>{t("onboarding.addToHomeScreen")}</h3>
          <p>{t("onboarding.iosBody")}</p>
          <ol className="install-steps">
            <li>
              {t("onboarding.iosStep1")} <Share size={14} className="install-step-icon" />
            </li>
            <li>
              {t("onboarding.iosStep2")} <strong>{t("onboarding.addToHomeScreenAction")}</strong>{" "}
              <PlusSquare size={14} className="install-step-icon" />
            </li>
          </ol>
          <div className="modal-actions">
            <button onClick={() => setStep("permissions")}>{t("onboarding.gotIt")}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={dismiss}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{t("onboarding.stayInLoop")}</h3>
        <p>{t("onboarding.permissionsBody")}</p>
        <div className="modal-actions">
          <button onClick={dismiss}>{t("onboarding.notNow")}</button>
          <button onClick={handleEnable} disabled={busy}>
            {busy ? t("onboarding.requesting") : t("onboarding.enable")}
          </button>
        </div>
      </div>
    </div>
  );
}
