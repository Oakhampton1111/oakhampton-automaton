import type { BacktestCase, BacktestDecision, BacktestPolicy, BacktestReport } from "./types.js";
const INJECTION = [/ignore (all|any|the|previous) instructions/i, /disregard (the )?(system|previous)/i, /reveal (the )?(secret|system prompt|password)/i, /pretend (you are|you're) (dan|a)/i, /disable (security|safety)/i, /d3l3t3\s+@ll/i];
export function detectInjectionSignals(text: string): boolean { return INJECTION.some((pattern) => pattern.test(text)); }
export function decideBacktestCase(test: BacktestCase, policy: BacktestPolicy): BacktestDecision {
  const reasons: string[] = []; const { candidate, assessment } = test;
  const expectedRevenue = Math.floor(assessment.estimatedRevenueCents * assessment.confidenceBps / 10_000);
  const expectedProfitCents = expectedRevenue - assessment.maximumCostCents;
  const returnOnCost = assessment.maximumCostCents === 0 ? (expectedRevenue > 0 ? Number.POSITIVE_INFINITY : 0) : expectedRevenue / assessment.maximumCostCents;
  if (!candidate.humanApproved) reasons.push("HUMAN_APPROVAL_REQUIRED");
  if (assessment.recommendation !== "accept") reasons.push("ASSESSMENT_NOT_ACCEPTED");
  if (assessment.confidenceBps < policy.minimumConfidenceBps) reasons.push("CONFIDENCE_BELOW_GATE");
  if (expectedProfitCents < policy.minimumExpectedProfitCents) reasons.push("EXPECTED_PROFIT_BELOW_GATE");
  if (returnOnCost < policy.minimumReturnOnCost) reasons.push("RETURN_ON_COST_BELOW_GATE");
  if (assessment.estimatedRevenueCents > policy.maximumRevenueCents) reasons.push("REVENUE_CAP_EXCEEDED");
  if (assessment.maximumCostCents > policy.maximumCostCents) reasons.push("COST_CAP_EXCEEDED");
  if (policy.requireEvidence && (candidate.acceptanceCriteria.length === 0 || candidate.evidenceRequired.length === 0 || assessment.requiredEvidence.length === 0)) reasons.push("EVIDENCE_INCOMPLETE");
  if (policy.rejectInjectionSignals && detectInjectionSignals(`${candidate.title}\n${candidate.body}`)) reasons.push("INJECTION_SIGNAL");
  return { id: test.id, decision: reasons.length ? "reject" : "accept", reasons, expectedProfitCents };
}
export function runBacktest(cases: BacktestCase[], policy: BacktestPolicy): BacktestReport {
  const decisions = cases.map((item) => decideBacktestCase(item, policy)); let trueAccepts=0,trueRejects=0,falseAccepts=0,falseRejects=0,profit=0;
  decisions.forEach((decision,index) => {
    const expected = cases[index].expectedDecision;
    if (decision.decision === "accept") { profit += decision.expectedProfitCents; expected === "accept" ? trueAccepts++ : falseAccepts++; }
    else expected === "reject" ? trueRejects++ : falseRejects++;
  });
  const precision = trueAccepts + falseAccepts === 0 ? 0 : trueAccepts / (trueAccepts + falseAccepts);
  const recall = trueAccepts + falseRejects === 0 ? 0 : trueAccepts / (trueAccepts + falseRejects);
  const safetyScore = trueRejects * 10 + trueAccepts * 3 - falseRejects * 2 - falseAccepts * 100;
  return { policy, cases: cases.length, trueAccepts, trueRejects, falseAccepts, falseRejects, precision, recall,
    estimatedExpectedProfitCents: profit, safetyScore, decisions };
}
export function tuneBacktest(cases: BacktestCase[], policies: BacktestPolicy[]): BacktestReport {
  if (!policies.length) throw new Error("at least one backtest policy required");
  return policies.map((policy) => runBacktest(cases, policy)).sort((a,b) =>
    b.safetyScore - a.safetyScore || b.estimatedExpectedProfitCents - a.estimatedExpectedProfitCents || b.precision - a.precision)[0];
}
