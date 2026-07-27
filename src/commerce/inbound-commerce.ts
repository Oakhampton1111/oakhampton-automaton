export type InboundKind="award"|"interview"|"client_message"|"scope_change"|"payment_notice"|"job_alert"|"noise";
export interface InboundAssessment{kind:InboundKind;confidence:number;urgent:boolean;reasons:string[];}
const any=(s:string,patterns:RegExp[])=>patterns.some(p=>p.test(s));
export function classifyInboundCommerce(input:{subject?:string;body?:string;from?:string}):InboundAssessment{
  const s=`${input.subject??""}\n${input.body??""}`.toLowerCase(),reasons:string[]=[];
  if(any(s,[/you(?:'ve| have) been (?:hired|awarded)/,/contract (?:offer|awarded)/,/offer (?:sent|accepted)/,/milestone (?:has been )?funded/,/project (?:has been )?awarded/])){reasons.push("award language");return{kind:"award",confidence:.94,urgent:true,reasons};}
  if(any(s,[/interview/,/schedule (?:a )?(?:call|meeting)/,/availability for/,/invite you to (?:chat|meet)/,/video call/])){reasons.push("interview or meeting request");return{kind:"interview",confidence:.9,urgent:true,reasons};}
  if(any(s,[/scope (?:has )?changed/,/additional requirement/,/change request/,/out of scope/,/new deliverable/])){reasons.push("scope-change language");return{kind:"scope_change",confidence:.88,urgent:true,reasons};}
  if(any(s,[/payment (?:sent|released|received)/,/transaction hash/,/paid invoice/,/funds (?:sent|released)/])){reasons.push("payment language");return{kind:"payment_notice",confidence:.84,urgent:true,reasons};}
  if(any(s,[/new job/,/job alert/,/recommended jobs?/,/opportunit(?:y|ies) for you/,/new project posted/])){reasons.push("job-alert language");return{kind:"job_alert",confidence:.8,urgent:false,reasons};}
  if(any(s,[/unsubscribe/,/newsletter/,/marketing preferences/,/weekly digest/]))return{kind:"noise",confidence:.8,urgent:false,reasons:["bulk-mail language"]};
  return{kind:"client_message",confidence:.6,urgent:false,reasons:["unclassified inbound routed for review"]};
}
