import { createHmac, timingSafeEqual } from "crypto";
import type { RevenueReceipt } from "../economic/revenue-verification.js";
export interface StripeWebhookConfig { signingSecret: string; toleranceSeconds?: number; allowedCurrencies: Array<"AUD" | "USD">; }
export class StripeSandboxRevenueProvider {
  constructor(private readonly config: StripeWebhookConfig) {
    if (!config.signingSecret.startsWith("whsec_")) throw new Error("Stripe webhook signing secret required");
  }
  parseAndVerify(rawBody: string, signatureHeader: string, now = Date.now()): RevenueReceipt {
    const parts = Object.fromEntries(signatureHeader.split(",").map((part) => part.split("=", 2) as [string, string]));
    const timestamp = Number(parts.t); const signature = parts.v1;
    if (!Number.isFinite(timestamp) || !signature) throw new Error("INVALID_STRIPE_SIGNATURE_HEADER");
    if (Math.abs(now - timestamp * 1_000) > (this.config.toleranceSeconds ?? 300) * 1_000) throw new Error("STALE_STRIPE_EVENT");
    const expected = createHmac("sha256", this.config.signingSecret).update(`${timestamp}.${rawBody}`).digest("hex");
    const provided = Buffer.from(signature, "hex"); const expectedBuffer = Buffer.from(expected, "hex");
    if (provided.length !== expectedBuffer.length || !timingSafeEqual(provided, expectedBuffer)) throw new Error("INVALID_STRIPE_SIGNATURE");
    const event = JSON.parse(rawBody) as any;
    if (event.livemode !== false) throw new Error("LIVE_STRIPE_EVENT_REJECTED");
    if (event.type !== "checkout.session.completed") throw new Error("UNSUPPORTED_STRIPE_EVENT");
    const session = event.data?.object; const currency = String(session?.currency ?? "").toUpperCase();
    if (!this.config.allowedCurrencies.includes(currency as "AUD" | "USD")) throw new Error("CURRENCY_NOT_ALLOWED");
    if (!Number.isInteger(session?.amount_total) || session.amount_total <= 0 || !session?.metadata?.reference) throw new Error("INVALID_STRIPE_SESSION");
    return { provider: "stripe", environment: "sandbox", eventId: event.id, reference: session.metadata.reference,
      amountCents: session.amount_total, currency: currency as "AUD" | "USD", signatureVerified: true,
      occurredAt: new Date(timestamp * 1_000).toISOString() };
  }
  createPaymentLinkRequest(priceId: string, reference: string) {
    if (!priceId.startsWith("price_") || !reference) throw new Error("INVALID_PAYMENT_LINK_REQUEST");
    return { method: "POST" as const, path: "/v1/payment_links", idempotencyKey: `payment-link-${reference}`,
      body: { "line_items[0][price]": priceId, "line_items[0][quantity]": "1", "metadata[reference]": reference } };
  }
}
