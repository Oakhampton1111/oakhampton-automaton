import { ulid } from "ulid";
import type { ActionReceipt } from "./types.js";
import { CapabilityBroker } from "./broker.js";
import { EconomicLedger } from "./ledger.js";

export class SimulationGateway {
  constructor(private readonly broker: CapabilityBroker, private readonly ledger: EconomicLedger) {}

  execute(grantId: string, actualCostCents: number, acceptedValueCents: number, evidence: string[]): ActionReceipt {
    const grant = this.broker.consume(grantId);
    if (actualCostCents > grant.maximumCostCents) throw new Error("actual cost exceeds capability ceiling");
    if (evidence.length === 0) throw new Error("at least one evidence reference is required");
    this.ledger.settle(grant.proposalId, actualCostCents, grant.actionType === "procure_compute" ? "compute_expense" : "delivery_expense");
    if (acceptedValueCents > 0) this.ledger.recordAcceptedValue(grant.proposalId, acceptedValueCents);
    return {
      receiptId: ulid(), grantId: grant.grantId, proposalId: grant.proposalId, status: "simulated",
      actualCostCents, acceptedValueCents, evidence: [...evidence], createdAt: new Date().toISOString(),
    };
  }
}

