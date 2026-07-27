import { describe,expect,it } from "vitest";
import { analyzePublicCorpus } from "../backtest/index.js";
describe("public corpus calibration",()=>{
  it("derives deterministic lifecycle and complexity priors",()=>{
    const report=analyzePublicCorpus([
      {state:"closed",close_duration_days:2,comments:1,body_length_bucket:1,label_count:1,has_assignee:true,has_milestone:false,injection:false,security:false,bug:true,feature:false,evidence:true},
      {state:"closed",close_duration_days:20,comments:20,body_length_bucket:12,label_count:2,has_assignee:false,has_milestone:false,injection:false,security:true,bug:true,feature:false,evidence:true},
      {state:"open",close_duration_days:null,comments:0,body_length_bucket:2,label_count:0,has_assignee:false,has_milestone:false,injection:false,security:false,bug:false,feature:true,evidence:false},
    ]);
    expect(report).toMatchObject({issues:3,closedRate:2/3,evidenceRate:2/3,medianCloseDays:2,p90CloseDays:2,medianComments:1});
    expect(report.recommendedComplexityBufferBps).toBeGreaterThan(1000);
  });
  it("handles an empty corpus safely",()=>{expect(analyzePublicCorpus([])).toMatchObject({issues:0,closedRate:0,medianCloseDays:null});});
});
