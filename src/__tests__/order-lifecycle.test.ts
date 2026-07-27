import {describe,expect,it} from "vitest";
import Database from "better-sqlite3";
import {assessOwnedScope,safeContractPath,shouldDeleteIntake} from "../commerce/order-lifecycle.js";
import {DurableCommerceStore} from "../commerce/durable-store.js";

describe("owned order lifecycle",()=>{
  it("accepts a bounded profitable repair",()=>{
    const x=assessOwnedScope({offerId:"workflow-repair",brief:"Repair one failing n8n webhook and provide regression evidence and rollback notes.",files:[]});
    expect(x.accepted).toBe(true);
    expect(x.predictedGrossMarginBps).toBeGreaterThanOrEqual(5000);
  });
  it("rescope complex work instead of consuming a fixed package",()=>{
    const x=assessOwnedScope({offerId:"api-integration",brief:"Production-critical multi-tenant migration across Salesforce, Xero, HubSpot, Shopify, a legacy database, multiple environments, real-time SLA and high volume processing.",files:Array.from({length:10},(_,i)=>({name:`f${i}.pdf`}))});
    expect(x.accepted).toBe(false);
    expect(x.reasons).toContain("EFFORT_BUDGET_EXCEEDED");
  });
  it("rejects incomplete or unknown scopes",()=>{
    expect(assessOwnedScope({offerId:"custom-agent",brief:"too short",files:[]}).reasons).toContain("SCOPE_INCOMPLETE");
    expect(()=>assessOwnedScope({offerId:"unknown",brief:"A sufficiently complete project description",files:[]})).toThrow("UNKNOWN_OWNED_OFFER");
  });
  it("constrains deletion paths and dates",()=>{
    expect(safeContractPath("/tmp/intake","01ARZ3NDEKTSV4RRFFQ69G5FAV")).toBe("/tmp/intake/01ARZ3NDEKTSV4RRFFQ69G5FAV");
    expect(()=>safeContractPath("/tmp/intake","../escape")).toThrow();
    expect(shouldDeleteIntake({deleteAfter:"2025-01-01T00:00:00Z",now:new Date("2026-01-01T00:00:00Z")})).toBe(true);
  });
  it("records queryable order state and operating snapshots",()=>{
    const store=new DurableCommerceStore(new Database(":memory:"));
    store.setState("order:one",{stage:"awaiting_intake"});
    store.setState("other:one",{ignored:true});
    expect(store.listState<{stage:string}>("order:")).toEqual([expect.objectContaining({key:"order:one",value:{stage:"awaiting_intake"}})]);
    expect(store.operatingSnapshot()).toMatchObject({queued:0,deadLetter:0,settledContributionCents:0});
    store.deleteState("order:one");
    expect(store.listState("order:")).toHaveLength(0);
  });
});
