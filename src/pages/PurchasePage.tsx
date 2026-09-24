import { type FormEvent, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../api/client";
import AuthBrand from "../components/AuthBrand";
import AuthFooter from "../components/AuthFooter";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { type PlanKey, type Interval, PLAN_LABEL, formatPrice, priceBreakdownFor } from "../lib/planPricing";

export default function PurchasePage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const plan: PlanKey = searchParams.get("plan") === "unlimited" ? "unlimited" : "starter";
  const interval: Interval = searchParams.get("interval") === "yearly" ? "yearly" : "monthly";
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const price = priceBreakdownFor(plan, interval);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { redirectUrl } = await api.startPurchase({ email, plan, interval });
      window.location.href = redirectUrl;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("purchase.failed"));
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-lang-switcher">
        <LanguageSwitcher />
      </div>
      <AuthBrand />
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>{t("purchase.title")}</h1>
        <div className="purchase-summary">
          <span className="purchase-plan-name">{PLAN_LABEL[plan]}</span>
          <span className="purchase-plan-price">
            {formatPrice(price.gross)}
            <span className="purchase-plan-interval">
              {interval === "monthly" ? t("purchase.perMonth") : t("purchase.perYear")}
            </span>
          </span>
          <span className="purchase-plan-vat-breakdown">
            {formatPrice(price.net)} + {formatPrice(price.vat)} VAT (21%)
          </span>
        </div>
        <p className="hint">{t("purchase.emailHint")}</p>
        {error && <div className="error">{error}</div>}

        <label>
          {t("auth.email")}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>

        <button type="submit" disabled={submitting}>
          {submitting ? t("purchase.redirecting") : t("purchase.continueToPayment")}
        </button>
        <p className="hint">{t("purchase.existingAccountHint")}</p>
      </form>
      <AuthFooter />
    </div>
  );
}
