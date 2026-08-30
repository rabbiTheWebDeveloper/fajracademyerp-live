// Shared billing config — safe to import in both client and server
export const PLANS = {
  Basic:        { price: 299,  features: ["Up to 100 products", "Basic analytics", "Email support"] },
  Standard:     { price: 599,  features: ["Up to 500 products", "Advanced analytics", "Priority support"] },
  Professional: { price: 999,  features: ["Unlimited products", "Full analytics", "24/7 support"] },
};

export const BILLING_CYCLE_DAYS = 30;
export const GRACE_PERIOD_DAYS  = 7;
export const VAT_PERCENT        = 5;
export const PLATFORM_NAME      = "FunnelLiner";
export const SUPPORT_EMAIL      = "support@funnelliner.com";
