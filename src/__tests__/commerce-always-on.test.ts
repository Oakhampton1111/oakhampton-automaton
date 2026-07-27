import {describe,expect,it} from "vitest";
import Database from "better-sqlite3";
import {authorizeLiveAction,DEFAULT_LIVE_COMMERCE_POLICY} from "../commerce/live-policy.js";
import {DurableCommerceStore} from "../commerce/durable-store.js";

describe("always-on commerce safety",()=>{
  it("never executes externally in shadow mode",()=>{
    const result=authorizeLiveAction(DEFAULT_LIVE_COMMERCE_POLICY,{action:"accept_contract",offerId:"offer-report",amountCents:100000,currency:"AUD",reversible:true,paymentVerified:true,acceptanceTestable:true},0);
    expect(result).toMatchObject({allowed:true,execute:false,escalate:false});
  });
  it("enforces contract, spend and exception boundaries",()=>{
    const live={...DEFAULT_LIVE_COMMERCE_POLICY,mode:"capped_live" as const};
    expect(authorizeLiveAction(live,{action:"accept_contract",offerId:"offer-report",amountCents:150001,currency:"AUD",reversible:true,paymentVerified:true,acceptanceTestable:true},0).reasons).toContain("CONTRACT_CAP");
    expect(authorizeLiveAction(live,{action:"spend",amountCents:2,currency:"AUD",reversible:true},49999).reasons).toContain("MONTHLY_SPEND_CAP");
    expect(authorizeLiveAction(live,{action:"deliver",reversible:false,acceptanceTestable:true,riskFlags:["regulated"]},0).reasons).toContain("EXCEPTION_RISK");
  });
  it("is idempotent, lease-safe, retryable and dead-letters",()=>{
    const db=new Database(":memory:"); const store=new DurableCommerceStore(db);
    const first=store.enqueue("work",{x:1},"same",undefined,2); const same=store.enqueue("work",{x:2},"same");
    expect(same.jobId).toBe(first.jobId);
    const leased=store.leaseNext("worker",1)!; expect(leased.attempts).toBe(1);
    store.fail(leased,"worker","temporary",0);
    const retry=store.leaseNext("worker")!; expect(retry.attempts).toBe(2);
    store.fail(retry,"worker","terminal",0);
    expect(store.counts().dead_letter).toBe(1);
    expect(()=>store.complete(first.jobId,"wrong-owner")).toThrow("job lease lost");
  });
  it("maintains suppression and exact spend accounting",()=>{
    const store=new DurableCommerceStore(new Database(":memory:"));
    store.suppress("Person@Example.com","opt-out"); store.recordSpend(1234,"ads");
    expect(store.isSuppressed("person@example.com")).toBe(true);
    expect(store.monthSpend()).toBe(1234);
    expect(()=>store.recordSpend(-1,"ads")).toThrow("invalid spend");
  });
});
