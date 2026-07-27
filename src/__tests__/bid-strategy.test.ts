import { describe, expect, it } from "vitest";
import { buildBidStrategy, extractClientSignals, renderSpecificOpening } from "../commerce/bid-strategy.js";

const q:any={eligible:true,skillId:"software",reasons:[],routing:{providerId:"openai",modelId:"premium",estimatedQualityBps:9800,estimatedCostCents:80,requiresCritic:true,rationale:[]},estimatedProductionCents:3000,estimatedMarginCents:90000,estimatedHours:6,acceptanceTestable:true};
const job=(patch:any={})=>({platformId:"upwork",sourceId:"1",url:"https://example.com/1",language:"en",title:"OpenClaw API automation",body:"Connect our lead form to an OpenClaw workflow. Deliver a tested Docker deployment and handover notes.",budgetCents:100000,currency:"USD",metadata:{acceptanceCriteria:["Docker health check passes"],...patch.metadata},...patch});

describe("bid strategy",()=>{
  it("prices high-fit autonomous work to win without going below the production floor",()=>{const s=buildBidStrategy(job(),q);expect(s.route).toBe("autonomous");expect(s.bidPriceCents).toBe(82000);expect(s.matchedCapabilities).toContain("OpenClaw support");});
  it("routes larger work to OpenClaw instead of discarding it",()=>expect(buildBidStrategy(job({budgetCents:900000}),q).route).toBe("openclaw"));
  it("routes on-site requirements to a human",()=>expect(buildBidStrategy(job({body:"Need an on-site AI engineer for a production migration."}),q).route).toBe("human"));
  it("declines prohibited financial claims",()=>expect(buildBidStrategy(job({body:"Build a bot with guaranteed returns and trade my funds."}),q).route).toBe("decline"));
  it("extracts and cites client-specific requirements",()=>{const o=job();const s=buildBidStrategy(o,q);expect(extractClientSignals(o)[0]).toContain("Docker health check");expect(renderSpecificOpening(o,s)).toContain("You specifically need");});
});

