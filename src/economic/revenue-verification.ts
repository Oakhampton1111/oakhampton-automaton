export interface RevenueReceipt {
  provider: string;
  environment: "sandbox" | "live";
  eventId: string;
  reference: string;
  amountCents: number;
  currency: "USD" | "AUD" | "USDC";
  signatureVerified: boolean;
  occurredAt: string;
}
export interface RevenueVerification {
  accepted: boolean;
  countTowardGraduation: boolean;
  reasonCode: string;
}
export interface RevenueVerifier {
  verify(receipt: RevenueReceipt): RevenueVerification;
}

export class GovernedRevenueVerifier implements RevenueVerifier {
  constructor(
    private readonly allowedProviders: string[],
    private readonly allowedCurrencies: RevenueReceipt["currency"][],
    private readonly liveRevenueEnabled = false,
    private readonly maximumAgeMs = 7 * 24 * 60 * 60 * 1_000,
  ) {}

  verify(receipt: RevenueReceipt): RevenueVerification {
    if (!this.allowedProviders.includes(receipt.provider)) return { accepted: false, countTowardGraduation: false, reasonCode: "PROVIDER_NOT_ALLOWED" };
    if (!this.allowedCurrencies.includes(receipt.currency)) return { accepted: false, countTowardGraduation: false, reasonCode: "CURRENCY_NOT_ALLOWED" };
    if (!receipt.eventId || !receipt.reference || !Number.isInteger(receipt.amountCents) || receipt.amountCents <= 0) return { accepted: false, countTowardGraduation: false, reasonCode: "INVALID_RECEIPT" };
    if (!receipt.signatureVerified) return { accepted: false, countTowardGraduation: false, reasonCode: "SIGNATURE_NOT_VERIFIED" };
    const occurredAt = new Date(receipt.occurredAt).getTime();
    if (!Number.isFinite(occurredAt) || Math.abs(Date.now() - occurredAt) > this.maximumAgeMs) return { accepted: false, countTowardGraduation: false, reasonCode: "RECEIPT_OUTSIDE_TIME_WINDOW" };
    if (receipt.environment === "live" && !this.liveRevenueEnabled) return { accepted: false, countTowardGraduation: false, reasonCode: "LIVE_REVENUE_DISABLED" };
    if (receipt.environment === "sandbox") return { accepted: true, countTowardGraduation: false, reasonCode: "SANDBOX_REVENUE_ACCEPTED" };
    return { accepted: true, countTowardGraduation: true, reasonCode: "LIVE_REVENUE_VERIFIED" };
  }
}
