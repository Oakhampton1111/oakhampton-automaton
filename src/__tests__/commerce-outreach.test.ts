import {describe,expect,it} from "vitest";
import {OutreachThrottle,SuppressionRegistry,summarizeAttribution} from "../commerce/index.js";
const limits={email:5,community_reply:5,marketplace_proposal:10,partner:5,paid_search:1,organic_page:10} as const;
const policy={dailyLimits:{...limits},maximumFollowUps:1,minimumRelevanceBps:7000,requireApproval:["email","community_reply"] as Array<"email"|"community_reply">,allowedCountries:["AU","US","GB"]};
const lead={id:"lead-1",domain:"example.com",country:"AU",language:"en",publicBusinessContact:true,observedProblem:"manual reports",relevanceBps:9000,sourceUrl:"https://example.com/jobs/report"};
const attempt={leadId:"lead-1",channel:"email" as const,campaignId:"c1",timestamp:"2026-07-20T01:00:00Z",followUpNumber:0,approved:true};
describe("bounded website outreach",()=>{
 it("permits approved relevant outreach",()=>expect(new OutreachThrottle(policy,new SuppressionRegistry()).assess(lead,attempt).allowed).toBe(true));
 it("requires email approval",()=>expect(new OutreachThrottle(policy,new SuppressionRegistry()).assess(lead,{...attempt,approved:false}).reasons).toContain("APPROVAL_REQUIRED"));
 it("requires public business contact",()=>expect(new OutreachThrottle(policy,new SuppressionRegistry()).assess({...lead,publicBusinessContact:false},attempt).reasons).toContain("NO_PUBLIC_BUSINESS_CONTACT"));
 it("honours suppression",()=>{const s=new SuppressionRegistry();s.suppress("example.com","opt out");expect(new OutreachThrottle(policy,s).assess(lead,attempt).reasons).toContain("SUPPRESSED")});
 it("enforces follow-up limits",()=>expect(new OutreachThrottle(policy,new SuppressionRegistry()).assess(lead,{...attempt,followUpNumber:2}).reasons).toContain("FOLLOW_UP_LIMIT"));
 it("prevents duplicates",()=>expect(new OutreachThrottle(policy,new SuppressionRegistry(),[attempt]).assess(lead,attempt).reasons).toContain("DUPLICATE_ATTEMPT"));
 it("enforces daily limits",()=>{const h=Array.from({length:5},(_,i)=>({...attempt,leadId:`l${i}`}));expect(new OutreachThrottle(policy,new SuppressionRegistry(),h).assess(lead,attempt).reasons).toContain("DAILY_LIMIT")});
 it("tracks profit not clicks",()=>expect(summarizeAttribution([{campaignId:"c",type:"visit",costCents:100,timestamp:"x"},{campaignId:"c",type:"contract",timestamp:"x"},{campaignId:"c",type:"settled_revenue",amountCents:20000,timestamp:"x"},{campaignId:"c",type:"refund",amountCents:3000,timestamp:"x"}])).toMatchObject({revenueCents:17000,costCents:100,netCents:16900,contracts:1}));
});
