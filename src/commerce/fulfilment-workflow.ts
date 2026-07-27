import { createHash } from "node:crypto";
export type FulfilmentSkill="software"|"research"|"data"|"website"|"documents";
export interface FulfilmentInput { contractId:string;skillId:FulfilmentSkill;scope:string;acceptance:string[];paymentVerified:boolean;customerFiles:string[];maximumRevisions:number; }
export interface FulfilmentPlan { contractId:string;workspaceId:string;skillId:FulfilmentSkill;steps:string[];acceptance:string[];allowedInputs:string[];prohibitedActions:string[];maximumRevisions:number; }
export interface DeliverableFile { name:string;sha256:string;bytes:number;mediaType:string; }
export interface DeliveryManifest { contractId:string;files:DeliverableFile[];acceptanceResults:Array<{criterion:string;passed:boolean;evidence:string}>;qualityScoreBps:number;paymentVerified:boolean;criticApproved:boolean;createdAt:string; }
const SAFE_ID=/^[A-Za-z0-9._-]{1,80}$/;
export function planFulfilment(input:FulfilmentInput):FulfilmentPlan {
 if(!input.paymentVerified)throw new Error("PAYMENT_NOT_VERIFIED");if(!SAFE_ID.test(input.contractId))throw new Error("INVALID_CONTRACT_ID");if(input.scope.trim().length<20)throw new Error("SCOPE_INCOMPLETE");if(!input.acceptance.length)throw new Error("ACCEPTANCE_NOT_TESTABLE");if(input.maximumRevisions<0||input.maximumRevisions>2)throw new Error("REVISION_LIMIT_INVALID");
 const allowedInputs=input.customerFiles.map(safeFilename);const common=["Create an isolated contract workspace","Copy only allowlisted customer inputs","Produce the scoped deliverable","Run every acceptance check","Run an independent final critique","Create a checksummed delivery manifest"];
 const specialist:Record<FulfilmentSkill,string>={software:"Run automated tests and static checks",research:"Verify citations and distinguish evidence from inference",data:"Reconcile row counts, totals, schema, and exceptions",website:"Build and test responsive, accessible output",documents:"Render and visually inspect every page"};
 return {contractId:input.contractId,workspaceId:"contract-"+input.contractId,skillId:input.skillId,steps:[...common.slice(0,3),specialist[input.skillId],...common.slice(3)],acceptance:[...input.acceptance],allowedInputs,prohibitedActions:["Access unrelated credentials or files","Deploy or publish without authorization","Make purchases or outgoing payments","Modify the control-plane runtime"],maximumRevisions:input.maximumRevisions};
}
export function createDeliveryManifest(input:{contractId:string;files:Array<{name:string;content:string|Buffer;mediaType:string}>;acceptanceResults:Array<{criterion:string;passed:boolean;evidence:string}>;qualityScoreBps:number;paymentVerified:boolean;criticApproved:boolean}):DeliveryManifest {
 if(!input.paymentVerified)throw new Error("PAYMENT_NOT_VERIFIED");if(!input.criticApproved)throw new Error("CRITIC_NOT_APPROVED");if(input.qualityScoreBps<9500)throw new Error("QUALITY_GATE_FAILED");if(!input.acceptanceResults.length||input.acceptanceResults.some(x=>!x.passed||!x.evidence.trim()))throw new Error("ACCEPTANCE_FAILED");if(!input.files.length)throw new Error("DELIVERABLE_EMPTY");
 const files=input.files.map(f=>{const name=safeFilename(f.name),data=Buffer.isBuffer(f.content)?f.content:Buffer.from(f.content);return{name,sha256:createHash("sha256").update(data).digest("hex"),bytes:data.length,mediaType:f.mediaType};});
 return {contractId:input.contractId,files,acceptanceResults:input.acceptanceResults.map(x=>({...x})),qualityScoreBps:input.qualityScoreBps,paymentVerified:true,criticApproved:true,createdAt:new Date().toISOString()};
}
export function deliveryAllowed(m:DeliveryManifest):boolean { return m.paymentVerified&&m.criticApproved&&m.qualityScoreBps>=9500&&m.files.length>0&&m.acceptanceResults.length>0&&m.acceptanceResults.every(x=>x.passed&&Boolean(x.evidence.trim())); }
function safeFilename(v:string):string { if(!v||v.includes("..")||v.includes("/")||v.includes("\\")||!SAFE_ID.test(v))throw new Error("UNSAFE_FILENAME");return v; }
