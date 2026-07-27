import {describe,expect,it} from "vitest";
import {qualifyForProduction} from "../quality/production.js";
import {buildBidStrategy} from "../commerce/bid-strategy.js";
const platform:any={id:"remotive",currencies:["USD"],feeBps:0};
const base:any={platformId:"remotive",sourceId:"x",url:"https://example.com",language:"en",title:"Python API automation",body:"Build a tested API integration with clear deliverables and acceptance requirements.",budgetCents:500000,currency:"USD",metadata:{}};
describe("employment and pricing hardening",()=>{
 it("rejects location-restricted staff employment",()=>{const o={...base,title:"Staff Product Engineer São Paulo",body:"This is a full-time remote role for candidates located in São Paulo. Requirements include Python and API development."};const q=qualifyForProduction(o,platform);expect(q.eligible).toBe(false);expect(q.reasons).toContain("EMPLOYMENT_ROLE_NOT_PROJECT_WORK");expect(q.reasons).toContain("GEOGRAPHIC_OR_WORK_AUTH_RESTRICTION");expect(buildBidStrategy(o,q).route).toBe("decline");});
 it("rejects mismatched customer-success employment",()=>{const o={...base,title:"Client Success Coach",body:"Join our team full-time as a client success coach. Requirements and reporting apply."};const q=qualifyForProduction(o,platform);expect(q.reasons).toContain("ROLE_OUTSIDE_PRODUCTION_CAPABILITY");expect(buildBidStrategy(o,q).route).toBe("decline");});
 it("accepts explicit project work and applies a commercial floor",()=>{const o={...base,platformId:"upwork"};const p={...platform,id:"upwork"};const q=qualifyForProduction(o,p);expect(q.estimatedHours).toBeGreaterThan(0);const s=buildBidStrategy(o,q);expect(s.bidPriceCents).toBeGreaterThanOrEqual(q.estimatedHours*9500);});
});
