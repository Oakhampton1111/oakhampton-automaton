import type { OpportunityBatch, OpportunityCandidate, OpportunityEvaluator, OpportunitySource } from "./types.js";
export interface StagingCycleSummary { mode: "staging"; externalEffectsEnabled: false; fetched: number; quarantined: number; evaluated: number; approved: number; rejected: number; candidates: Array<{ candidate: OpportunityCandidate; assessment?: Awaited<ReturnType<OpportunityEvaluator["evaluate"]>> }>; }
export class AutonomousStagingPipeline {
  constructor(private readonly sources: OpportunitySource[], private readonly evaluator: OpportunityEvaluator) {}
  async run(cursors: Array<string | undefined> = []): Promise<StagingCycleSummary> {
    const batches: OpportunityBatch[] = [];
    for (let i = 0; i < this.sources.length; i += 1) batches.push(await this.sources[i].fetch(cursors[i]));
    const candidates = batches.flatMap((batch) => batch.candidates); const output: StagingCycleSummary["candidates"] = [];
    for (const candidate of candidates) {
      if (!candidate.humanApproved) { output.push({ candidate }); continue; }
      output.push({ candidate, assessment: await this.evaluator.evaluate(candidate) });
    }
    const evaluated = output.filter((item) => item.assessment).length;
    const approved = output.filter((item) => item.assessment?.recommendation === "accept").length;
    return { mode: "staging", externalEffectsEnabled: false, fetched: candidates.length,
      quarantined: batches.reduce((sum, batch) => sum + batch.quarantined.length, 0), evaluated, approved,
      rejected: candidates.length - approved, candidates: output };
  }
}
