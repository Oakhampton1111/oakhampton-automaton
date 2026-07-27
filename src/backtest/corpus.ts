import { readFileSync } from "fs";
export interface PublicCorpusIssue {
  state: "open" | "closed"; close_duration_days: number | null; comments: number; body_length_bucket: number;
  label_count: number; has_assignee: boolean; has_milestone: boolean; injection: boolean; security: boolean; bug: boolean; feature: boolean; evidence: boolean;
}
export interface PublicCorpusReport {
  issues: number; closedRate: number; evidenceRate: number; securityRate: number; medianCloseDays: number | null;
  p90CloseDays: number | null; medianComments: number; recommendedComplexityBufferBps: number;
}
function percentile(values: number[], p: number): number | null {
  if (!values.length) return null; const sorted=[...values].sort((a,b)=>a-b); return sorted[Math.min(sorted.length-1,Math.floor((sorted.length-1)*p))];
}
export function analyzePublicCorpus(issues: PublicCorpusIssue[]): PublicCorpusReport {
  const durations=issues.map((x)=>x.close_duration_days).filter((x):x is number=>typeof x==="number"&&Number.isFinite(x)&&x>=0);
  const comments=issues.map((x)=>x.comments).filter((x)=>Number.isInteger(x)&&x>=0);
  const rate=(predicate:(x:PublicCorpusIssue)=>boolean)=>issues.length?issues.filter(predicate).length/issues.length:0;
  const complexitySignals=issues.length?issues.reduce((sum,x)=>sum+(x.body_length_bucket>=10?1:0)+(x.comments>=10?1:0)+(x.security?1:0),0)/(issues.length*3):0;
  return { issues:issues.length,closedRate:rate(x=>x.state==="closed"),evidenceRate:rate(x=>x.evidence),securityRate:rate(x=>x.security),
    medianCloseDays:percentile(durations,.5),p90CloseDays:percentile(durations,.9),medianComments:percentile(comments,.5)??0,
    recommendedComplexityBufferBps:Math.round(1000+complexitySignals*3000) };
}
export function loadAndAnalyzePublicCorpus(filePath:string):PublicCorpusReport {
  const parsed=JSON.parse(readFileSync(filePath,"utf8")) as {issues?:PublicCorpusIssue[]};
  if(!Array.isArray(parsed.issues)) throw new Error("INVALID_PUBLIC_CORPUS");
  return analyzePublicCorpus(parsed.issues);
}
