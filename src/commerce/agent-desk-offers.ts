import source from "./agent-desk-offers.json" with { type: "json" };

export interface AgentDeskOffer {
  name: string;
  checkoutName: string;
  amountAudCents: number;
  usdcCents: number;
  billing: "once" | "monthly";
  leadTime: string;
  conciergeDescription: string;
  keywords: string[];
}

export const OFFERS = source as Record<string, AgentDeskOffer>;
