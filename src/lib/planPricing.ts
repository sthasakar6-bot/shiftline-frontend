export type PlanKey = "starter" | "unlimited";
export type Interval = "monthly" | "yearly";

// Same numbers as shiftline-marketing's Pricing.tsx -- kept in sync by hand
// since these two apps don't share a package.
export const MONTHLY_PRICE: Record<PlanKey, number> = { starter: 9.99, unlimited: 19.99 };
export const YEARLY_PRICE: Record<PlanKey, number> = { starter: 95.9, unlimited: 191.9 };
export const PLAN_LABEL: Record<PlanKey, string> = { starter: "Starter", unlimited: "Unlimited" };

export function priceFor(plan: PlanKey, interval: Interval): number {
  return interval === "monthly" ? MONTHLY_PRICE[plan] : YEARLY_PRICE[plan];
}

export function formatPrice(n: number): string {
  return `€${n.toFixed(2)}`;
}

// Flat 21% Dutch VAT, matching the backend's actual charge (see
// computeVat in billing/providers/mollie.ts) -- these numbers are net
// (VAT-exclusive); this is purely for display before the real,
// server-computed amount is charged.
export const VAT_RATE = 0.21;

export interface PriceBreakdown {
  net: number;
  vat: number;
  gross: number;
}

export function priceBreakdownFor(plan: PlanKey, interval: Interval): PriceBreakdown {
  const net = priceFor(plan, interval);
  const vat = Math.round(net * VAT_RATE * 100) / 100;
  const gross = Math.round((net + vat) * 100) / 100;
  return { net, vat, gross };
}
