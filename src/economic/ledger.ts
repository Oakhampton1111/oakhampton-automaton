import { ulid } from "ulid";

export type LedgerAccount =
  | "cash"
  | "available_budget"
  | "reserved_budget"
  | "compute_expense"
  | "delivery_expense"
  | "accepted_value"
  | "collected_revenue";

export interface LedgerEntry {
  id: string;
  reference: string;
  account: LedgerAccount;
  deltaCents: number;
  createdAt: string;
  memo: string;
}

export class EconomicLedger {
  private readonly entries: LedgerEntry[] = [];
  private readonly reservations = new Map<string, number>();

  constructor(initialBudgetCents = 0) {
    if (!Number.isInteger(initialBudgetCents) || initialBudgetCents < 0) {
      throw new Error("initial budget must be a non-negative integer");
    }
    if (initialBudgetCents > 0) {
      this.post("initial", "available_budget", initialBudgetCents, "Initial shadow budget");
    }
  }

  balance(account: LedgerAccount): number {
    return this.entries.filter((entry) => entry.account === account)
      .reduce((sum, entry) => sum + entry.deltaCents, 0);
  }

  reserve(reference: string, maximumCostCents: number): void {
    this.assertAmount(maximumCostCents);
    if (this.reservations.has(reference)) throw new Error("reservation already exists");
    if (maximumCostCents > this.balance("available_budget")) throw new Error("insufficient available budget");
    this.post(reference, "available_budget", -maximumCostCents, "Reserve worst-case action cost");
    this.post(reference, "reserved_budget", maximumCostCents, "Reserve worst-case action cost");
    this.reservations.set(reference, maximumCostCents);
  }

  settle(reference: string, actualCostCents: number, expenseAccount: "compute_expense" | "delivery_expense"): void {
    this.assertAmount(actualCostCents);
    const reserved = this.reservations.get(reference);
    if (reserved === undefined) throw new Error("unknown reservation");
    if (actualCostCents > reserved) throw new Error("actual cost exceeds reservation");
    this.post(reference, "reserved_budget", -reserved, "Settle reservation");
    this.post(reference, expenseAccount, actualCostCents, "Actual action cost");
    this.post(reference, "available_budget", reserved - actualCostCents, "Release unused reservation");
    this.reservations.delete(reference);
  }

  recordAcceptedValue(reference: string, valueCents: number): void {
    this.assertAmount(valueCents);
    this.post(reference, "accepted_value", valueCents, "Independently accepted value");
  }

  recordCollectedRevenue(reference: string, revenueCents: number, computeAllocationBps = 3000): number {
    this.assertAmount(revenueCents);
    if (!Number.isInteger(computeAllocationBps) || computeAllocationBps < 0 || computeAllocationBps > 10_000) {
      throw new Error("compute allocation must be between 0 and 10000 basis points");
    }
    const allocation = Math.floor(revenueCents * computeAllocationBps / 10_000);
    this.post(reference, "collected_revenue", revenueCents, "Collected external revenue");
    this.post(reference, "cash", revenueCents, "Collected external revenue");
    this.post(reference, "available_budget", allocation, "Governed compute allocation from revenue");
    return allocation;
  }

  snapshot(): ReadonlyArray<LedgerEntry> {
    return this.entries.map((entry) => ({ ...entry }));
  }

  private post(reference: string, account: LedgerAccount, deltaCents: number, memo: string): void {
    this.entries.push({ id: ulid(), reference, account, deltaCents, createdAt: new Date().toISOString(), memo });
  }

  private assertAmount(amount: number): void {
    if (!Number.isInteger(amount) || amount < 0) throw new Error("amount must be a non-negative integer number of cents");
  }
}

