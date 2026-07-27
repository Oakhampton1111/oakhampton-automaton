import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import offers from "../commerce/agent-desk-offers.json" with { type: "json" };

const root = path.resolve(process.cwd(), "visibility-site/public");
const read = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");
const aud = (cents: number) => `AUD $${(cents / 100).toLocaleString("en-AU")}`;

describe("Agent Desk site contract", () => {
  it("renders every manifest price consistently", () => {
    const agentDesk = read("agent-desk/index.html");
    const concierge = read("assets/concierge.js");
    const support = read("support-plans/index.html");
    for (const [offerId, offer] of Object.entries(offers)) {
      const price = aud(offer.amountAudCents);
      const surface = offerId.startsWith("support-") ? support : agentDesk;
      expect(surface).toContain(`data-offer-price="${offerId}">${price}`);
      if (!offerId.startsWith("support-")) {
        expect(concierge).toContain(`"id":"${offerId}"`);
        expect(concierge).toContain(`"price":"${price}"`);
      }
    }
  });

  it("keeps critical customer-facing surfaces free of known internal copy defects", () => {
    const files = [
      "agent-desk/index.html",
      "book/index.html",
      "assets/concierge.js",
      "insights/index.html",
      "llms.txt",
      "operating-examples.md",
    ];
    const banned = [
      "delivery stays fast and profitable",
      "automation stack executes",
      "risk or commitment gates",
      "not legal, tax, medical or financial advice",
      "no generic proposal",
      "no silent overrun",
      "Â",
      "Ãƒ",
      "Ã‚",
      String.fromCharCode(19),
    ];
    for (const file of files) {
      const content = read(file).toLowerCase();
      for (const phrase of banned) {
        expect(content, `${file} contains ${JSON.stringify(phrase)}`).not.toContain(
          phrase.toLowerCase(),
        );
      }
    }
  });

  it("keeps public forms retry-safe", () => {
    for (const file of ["agent-desk/index.html", "book/index.html"]) {
      const content = read(file);
      expect(content).toContain('"idempotency-key"');
      expect(content).toContain('name="website"');
    }
  });
});
