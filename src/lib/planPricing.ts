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
