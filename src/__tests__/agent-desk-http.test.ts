import { afterEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { DurableCommerceStore } from "../commerce/durable-store.js";
import { createCommerceHttpServer } from "../commerce/health-server.js";
import { DEFAULT_LIVE_COMMERCE_POLICY } from "../commerce/live-policy.js";

const supervisor: any = {
  health: async () => ({
    running: true,
    lastSuccessAt: new Date().toISOString(),
    channels: [],
    queue: {},
    circuits: [],
    mode: "capped_live",
    killSwitch: false,
  }),
};

const running: Array<ReturnType<typeof createCommerceHttpServer>> = [];

async function withServer(
  run: (base: string, store: DurableCommerceStore) => Promise<void>,
) {
  const store = new DurableCommerceStore(new Database(":memory:"));
  const api = createCommerceHttpServer({
    supervisor,
    store,
    policy: { ...DEFAULT_LIVE_COMMERCE_POLICY, mode: "capped_live" },
    port: 0,
    intakeToken: "operator-secret",
  });
  running.push(api);
  await api.start();
  const address: any = api.server.address();
  await run(`http://127.0.0.1:${address.port}`, store);
}

afterEach(async () => {
  await Promise.all(
    running.splice(0).map((api) => api.stop().catch(() => undefined)),
  );
});

const valid = {
  email: " Buyer@Example.com ",
  problem: "Replace our repeated spreadsheet handoff with one tested workflow.",
  offerId: "agent-desk-custom",
  campaignId: "owned-agent-desk",
  language: "en",
};

describe("Agent Desk public HTTP contract", () => {
  it("accepts anonymous intake in capped-live mode and normalises custody data", async () => {
    await withServer(async (base, store) => {
      const response = await fetch(`${base}/v1/intake`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": "agent-desk-test-0001",
          "x-forwarded-for": "203.0.113.10",
        },
        body: JSON.stringify(valid),
      });
      expect(response.status).toBe(202);
      const receipt: any = await response.json();
      expect(receipt.reference).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
      const job: any = store.db
        .prepare("SELECT payload FROM commerce_jobs WHERE type='customer_intake'")
        .get();
      expect(JSON.parse(job.payload)).toMatchObject({
        sourceId: receipt.reference,
        email: "buyer@example.com",
        receivedFrom: "203.0.113.10",
      });
    });
  });

  it("deduplicates a retried submission with the same idempotency key", async () => {
    await withServer(async (base, store) => {
      const send = () =>
        fetch(`${base}/v1/intake`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "idempotency-key": "agent-desk-test-0002",
          },
          body: JSON.stringify(valid),
        });
      const first: any = await (await send()).json();
      const second: any = await (await send()).json();
      expect(second.reference).toBe(first.reference);
      const count: any = store.db
        .prepare(
          "SELECT count(*) AS count FROM commerce_jobs WHERE type='customer_intake'",
        )
        .get();
      expect(count.count).toBe(1);
    });
  });

  it("rejects malformed input and rate-limits one client", async () => {
    await withServer(async (base) => {
      const malformed = await fetch(`${base}/v1/intake`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...valid, email: "not-an-email" }),
      });
      expect(malformed.status).toBe(400);
      for (let i = 0; i < 10; i += 1) {
        const response = await fetch(`${base}/v1/intake`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "idempotency-key": `agent-desk-rate-${i}`,
          },
          body: JSON.stringify({ ...valid, problem: `${valid.problem} ${i}` }),
        });
        expect(response.status).toBe(202);
      }
      const limited = await fetch(`${base}/v1/intake`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": "agent-desk-rate-final",
        },
        body: JSON.stringify({ ...valid, problem: `${valid.problem} final` }),
      });
      expect(limited.status).toBe(429);
    });
  });

  it("silently accepts the honeypot without creating a job", async () => {
    await withServer(async (base, store) => {
      const response = await fetch(`${base}/v1/intake`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...valid, website: "https://spam.example" }),
      });
      expect(response.status).toBe(202);
      const count: any = store.db
        .prepare(
          "SELECT count(*) AS count FROM commerce_jobs WHERE type='customer_intake'",
        )
        .get();
      expect(count.count).toBe(0);
    });
  });

  it("keeps operator endpoints authenticated", async () => {
    await withServer(async (base) => {
      expect((await fetch(`${base}/v1/operations`)).status).toBe(401);
      expect(
        (
          await fetch(`${base}/v1/operations`, {
            headers: { authorization: "Bearer operator-secret" },
          })
        ).status,
      ).toBe(200);
    });
  });
});
