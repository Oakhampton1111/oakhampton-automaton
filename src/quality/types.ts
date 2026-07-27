export type QualityDimension = "requirements"|"factuality"|"evidence"|"usefulness"|"presentation"|"safety";
export type PrivacyClass = "public"|"internal"|"confidential";
export interface SkillContract { id:string; version:string; description:string; inputSchema:Record<string,unknown>; outputSchema:Record<string,unknown>; requiredQualityBps:number; dimensions:QualityDimension[]; maxInputTokens:number; maxOutputTokens:number; permittedTools:string[]; tags:string[]; }
export interface PromptTemplateVersion { id:string; version:string; skillId:string; stablePrefix:string; active:boolean; createdAt:string; }
export interface QualityScore { overallBps:number; dimensions:Partial<Record<QualityDimension,number>>; failures:string[]; }
export interface ModelBenchmark { skillId:string; modelId:string; providerId:string; qualityBps:number; reliabilityBps:number; averageCostCents:number; averageLatencyMs:number; sampleSize:number; }
export interface QualityRoutingInput { skillId:string; requiredQualityBps:number; jobValueCents:number; maximumProductionCostCents:number; complexityBps:number; ambiguityBps:number; privacyClass:PrivacyClass; }
export interface QualityRoutingDecision { providerId:string; modelId:string; estimatedQualityBps:number; estimatedCostCents:number; requiresCritic:boolean; rationale:string[]; }
