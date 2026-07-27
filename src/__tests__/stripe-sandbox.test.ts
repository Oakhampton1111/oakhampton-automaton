import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import { StripeSandboxRevenueProvider } from "../integrations/index.js";
function signed(livemode = false, offset = 0) {
  const secret = "whsec_test"; const timestamp = Math.floor(Date.now() / 1000) + offset;
  const body = JSON.stringify({ id: "evt_1", type: "checkout.session.completed", livemode, data: { object: { currency: "aud", amount_total: 1200, metadata: { reference: "job-1" } } } });
  const sig = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return { secret, body, header: `t=${timestamp},v1=${sig}` };
}
describe("Stripe sandbox provider", () => {
  it("verifies signed sandbox checkout evidence", () => { const x = signed(); const receipt = new StripeSandboxRevenueProvider({ signingSecret: x.secret, allowedCurrencies: ["AUD"] }).parseAndVerify(x.body, x.header); expect(receipt).toMatchObject({ environment: "sandbox", amountCents: 1200, signatureVerified: true }); });
  it("rejects tampering, stale events, and live events", () => {
    const x = signed(); const provider = new StripeSandboxRevenueProvider({ signingSecret: x.secret, allowedCurrencies: ["AUD"] });
    expect(() => provider.parseAndVerify(x.body + " ", x.header)).toThrow("INVALID_STRIPE_SIGNATURE");
    const stale = signed(false, -1000); expect(() => provider.parseAndVerify(stale.body, stale.header)).toThrow("STALE_STRIPE_EVENT");
    const live = signed(true); expect(() => provider.parseAndVerify(live.body, live.header)).toThrow("LIVE_STRIPE_EVENT_REJECTED");
  });
});
