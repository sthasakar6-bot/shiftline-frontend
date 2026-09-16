import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../api/client";
import { WHATSAPP_URL } from "../config";
import { type PlanKey, type Interval, priceFor, PLAN_LABEL, formatPrice } from "../lib/planPricing";

interface BillingStatus {
  plan: string;
  trialEndsAt: string | null;
  billingProvider: string | null;
  billingInterval: string | null;
  subscriptionStatus: string | null;
}

function daysLeft(trialEndsAt: string): number {
  return Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000));
}

export default function BillingSection() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [interval, setInterval] = useState<Interval>("monthly");
  const [error, setError] = useState<string | null>(null);
  const [checkingOutPlan, setCheckingOutPlan] = useState<PlanKey | null>(null);

  useEffect(() => {
    api
      .getBillingStatus()
      .then(setStatus)
      .catch((err) => setError(err instanceof ApiError ? err.message : t("billing.loadFailed")))
      .finally(() => setLoading(false));
  }, [t]);

  async function handleCheckout(plan: PlanKey) {
    setError(null);
    setCheckingOutPlan(plan);
    try {
      const { redirectUrl } = await api.createBillingCheckout({ plan, interval });
      window.location.href = redirectUrl;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("billing.checkoutFailed"));
      setCheckingOutPlan(null);
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
  const isOnTrial = status?.plan === "trial";

  function renderPlanCard(plan: PlanKey, highlight: boolean) {
    const isCurrent = status?.plan === plan;
    const price = priceFor(plan, interval);
    return (
      <div
        key={plan}
        className={`billing-card ${highlight ? "billing-card-highlight" : ""} ${isCurrent ? "billing-card-current" : ""}`}
      >
        {isCurrent ? (
          <span className="billing-card-badge billing-card-badge-current">{t("billing.currentPlanBadge")}</span>
        ) : (
          highlight && <span className="billing-card-badge">{t("billing.bestValue")}</span>
        )}
        <h3 className="billing-card-name">{PLAN_LABEL[plan]}</h3>
        <p className="billing-card-tagline">
          {plan === "starter" ? t("billing.starterTagline") : t("billing.unlimitedTagline")}
        </p>
        <div className="billing-card-price">
          <span className="billing-card-amount">{formatPrice(price)}</span>
          <span className="billing-card-note">
            {interval === "monthly" ? t("billing.perMonth") : t("billing.perYear")}
          </span>
        </div>
        <p className="billing-card-extra">
          {plan === "starter" ? t("billing.starterExtra") : t("billing.unlimitedExtra")}
        </p>
        <button
          type="button"
          onClick={() => handleCheckout(plan)}
          disabled={isCurrent || checkingOutPlan !== null}
        >
          {isCurrent
            ? t("billing.currentPlanBadge")
            : checkingOutPlan === plan
              ? t("billing.redirecting")
              : t("billing.getPlan", { plan: PLAN_LABEL[plan] })}
        </button>
      </div>
    );
  }

  return (
    <section className="panel">
      <h2>{t("billing.title")}</h2>

      {status?.subscriptionStatus === "past_due" && (
        <div className="error">{t("billing.pastDueWarning")}</div>
      )}
      {status?.subscriptionStatus === "canceled" && (
        <div className="error">{t("billing.canceledWarning")}</div>
      )}
      {error && <div className="error">{error}</div>}

      <div className="billing-toggle">
        <button
          type="button"
          className={interval === "monthly" ? "billing-toggle-active" : ""}
          onClick={() => setInterval("monthly")}
        >
          {t("billing.monthly")}
        </button>
        <button
          type="button"
          className={interval === "yearly" ? "billing-toggle-active" : ""}
          onClick={() => setInterval("yearly")}
        >
          {t("billing.yearly")} <span className="billing-discount">-20%</span>
        </button>
      </div>

      <div className="billing-cards">
        <div className="billing-card">
          {isOnTrial && <span className="billing-card-badge billing-card-badge-current">{t("billing.currentPlanBadge")}</span>}
          <h3 className="billing-card-name">{t("billing.trialName")}</h3>
          <p className="billing-card-tagline">{t("billing.trialTagline")}</p>
          <div className="billing-card-price">
            <span className="billing-card-amount">
              {isOnTrial && status?.trialEndsAt
                ? t("billing.trialDaysLeft", { count: daysLeft(status.trialEndsAt) })
                : t("billing.trialLength")}
            </span>
          </div>
          <p className="billing-card-extra">
            {isPaid ? t("billing.trialAlreadyUpgraded") : t("billing.trialExtra")}
          </p>
        </div>

        {renderPlanCard("starter", false)}
        {renderPlanCard("unlimited", true)}
      </div>

      {isPaid && (
        <p className="hint billing-manage-hint">
          {t("billing.mollieManageHint")}{" "}
          <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">
            {t("auth.contactUs")}
          </a>
        </p>
      )}
    </section>
  );
}
