import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../api/client";
import { WHATSAPP_URL } from "../config";

type PlanKey = "starter" | "unlimited";
type Interval = "monthly" | "yearly";

interface BillingStatus {
  plan: string;
  trialEndsAt: string | null;
  billingProvider: string | null;
  billingInterval: string | null;
  subscriptionStatus: string | null;
}

export default function BillingSection() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<PlanKey>("starter");
  const [interval, setInterval] = useState<Interval>("monthly");
  const [error, setError] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    api
      .getBillingStatus()
      .then(setStatus)
      .catch((err) => setError(err instanceof ApiError ? err.message : t("billing.loadFailed")))
      .finally(() => setLoading(false));
  }, [t]);

  async function handleCheckout() {
    setError(null);
    setCheckingOut(true);
    try {
      const { redirectUrl } = await api.createBillingCheckout({ plan, interval });
      window.location.href = redirectUrl;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("billing.checkoutFailed"));
      setCheckingOut(false);
    }
  }

  if (loading) {
    return (
      <section className="panel">
        <h2>{t("billing.title")}</h2>
        <p>{t("common.loading")}</p>
      </section>
    );
  }

  const isPaid = status?.plan === "starter" || status?.plan === "unlimited";

  return (
    <section className="panel">
      <h2>{t("billing.title")}</h2>

      {status && (
        <p className="hint">
          {isPaid
            ? t("billing.currentPlan", { plan: status.plan })
            : t("billing.onTrial")}
        </p>
      )}

      {status?.subscriptionStatus === "past_due" && (
        <div className="error">{t("billing.pastDueWarning")}</div>
      )}
      {status?.subscriptionStatus === "canceled" && (
        <div className="error">{t("billing.canceledWarning")}</div>
      )}
      {error && <div className="error">{error}</div>}

      <h3>{t("billing.changePlan")}</h3>
      <div className="inline-form">
        <select value={plan} onChange={(e) => setPlan(e.target.value as PlanKey)}>
          <option value="starter">{t("billing.starter")}</option>
          <option value="unlimited">{t("billing.unlimited")}</option>
        </select>
        <select value={interval} onChange={(e) => setInterval(e.target.value as Interval)}>
          <option value="monthly">{t("billing.monthly")}</option>
          <option value="yearly">{t("billing.yearly")}</option>
        </select>
      </div>

      <div className="actions">
        <button type="button" onClick={handleCheckout} disabled={checkingOut}>
          {checkingOut ? t("billing.redirecting") : t("billing.continueWithMollie")}
        </button>
      </div>

      {isPaid && (
        <p className="hint">
          {t("billing.mollieManageHint")}{" "}
          <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">
            {t("auth.contactUs")}
          </a>
        </p>
      )}
    </section>
  );
}
