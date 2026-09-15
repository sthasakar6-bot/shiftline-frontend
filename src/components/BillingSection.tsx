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

const INTENDED_PLAN_KEY = "shiftline_intended_plan";

export default function BillingSection() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<PlanKey>("starter");
  const [interval, setInterval] = useState<Interval>("monthly");
  const [error, setError] = useState<string | null>(null);
  const [checkingOutWith, setCheckingOutWith] = useState<"mollie" | "stripe" | null>(null);

  useEffect(() => {
    api
      .getBillingStatus()
      .then(setStatus)
      .catch((err) => setError(err instanceof ApiError ? err.message : t("billing.loadFailed")))
      .finally(() => setLoading(false));
  }, [t]);

  // Pre-select whatever the visitor clicked on the marketing site's pricing
  // page before signing up, if anything -- a same-session UI nicety, read
  // once and cleared, never sent to the backend.
  useEffect(() => {
    const raw = localStorage.getItem(INTENDED_PLAN_KEY);
    if (!raw) return;
    try {
      const intended = JSON.parse(raw) as { plan?: PlanKey; interval?: Interval };
      if (intended.plan === "starter" || intended.plan === "unlimited") setPlan(intended.plan);
      if (intended.interval === "monthly" || intended.interval === "yearly") {
        setInterval(intended.interval);
      }
    } catch {
      // ignore malformed value
    }
    localStorage.removeItem(INTENDED_PLAN_KEY);
  }, []);

  async function handleCheckout(provider: "mollie" | "stripe") {
    setError(null);
    setCheckingOutWith(provider);
    try {
      const { redirectUrl } = await api.createBillingCheckout({ plan, interval, provider });
      window.location.href = redirectUrl;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("billing.checkoutFailed"));
      setCheckingOutWith(null);
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
  const isMollieOnly = status?.billingProvider === "mollie";

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
        <button
          type="button"
          onClick={() => handleCheckout("mollie")}
          disabled={checkingOutWith !== null}
        >
          {checkingOutWith === "mollie" ? t("billing.redirecting") : t("billing.continueWithMollie")}
        </button>
        <button
          type="button"
          onClick={() => handleCheckout("stripe")}
          disabled={checkingOutWith !== null}
        >
          {checkingOutWith === "stripe" ? t("billing.redirecting") : t("billing.continueWithStripe")}
        </button>
      </div>

      {isPaid && (
        <p className="hint">
          {isMollieOnly ? (
            <>
              {t("billing.mollieManageHint")}{" "}
              <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">
                {t("auth.contactUs")}
              </a>
            </>
          ) : (
            t("billing.stripeManageHint")
          )}
        </p>
      )}
    </section>
  );
}
