import type {ChannelHealth, ChannelOpportunity, CommerceChannelAdapter} from "./channel-adapters.js";
import type {PlatformDefinition} from "./platform-registry.js";

type AgentMailMessage={message_id?:string;thread_id?:string;from?:string;to?:string[];subject?:string;text?:string;html?:string;preview?:string;labels?:string[];timestamp?:string;attachments?:Array<{attachment_id?:string;filename?:string;content_type?:string;size?:number}>};

export class AgentMailCommerceAdapter implements CommerceChannelAdapter {
  constructor(readonly platform:PlatformDefinition,private readonly env:NodeJS.ProcessEnv=process.env){}
  async health():Promise<ChannelHealth>{
    const ready=Boolean((this.env.AUTOMATON_AGENTMAIL_API_KEY||this.env.AGENTMAIL_API_KEY)&&this.env.AUTOMATON_AGENTMAIL_INBOX_ID);
    return {platformId:this.platform.id,ready,mode:"email_alert",reason:ready?undefined:"missing AgentMail key/inbox"};
  }
  async discover():Promise<{opportunities:ChannelOpportunity[]}>{return {opportunities:[]};}
  async fetchMessages(cursor?:string){
    if(!(await this.health()).ready)return {messages:[],cursor};
    const inbox=encodeURIComponent(this.env.AUTOMATON_AGENTMAIL_INBOX_ID!);
    const url=new URL(`https://api.agentmail.to/v0/inboxes/${inbox}/messages`);
    url.searchParams.set("limit","100");
    const response=await fetch(url,{headers:{authorization:`Bearer ${(this.env.AUTOMATON_AGENTMAIL_API_KEY||this.env.AGENTMAIL_API_KEY)!}`,accept:"application/json"},signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw new Error(`AGENTMAIL_API_ERROR:${response.status}`);
    const data:any=await response.json();
    const rows:AgentMailMessage[]=Array.isArray(data?.messages)?data.messages:[];
    const incoming=rows.filter(m=>!m.labels?.includes("sent")&&Boolean(m.message_id));
    const newer=cursor?incoming.filter(m=>String(m.timestamp??"")>cursor):incoming;
    const messages=newer.map(m=>({id:String(m.message_id),customerId:String(m.from??"unknown"),body:String(m.text??m.preview??m.html??""),subject:String(m.subject??""),from:String(m.from??""),to:m.to??[],threadId:String(m.thread_id??""),receivedAt:String(m.timestamp??""),attachments:m.attachments??[]}));
    const next=messages.reduce((latest,m)=>m.receivedAt>latest?m.receivedAt:latest,cursor??"");
    return {messages,cursor:next||cursor};
  }
  async submitApprovedAction(input:{type:string;payload:Record<string,unknown>;idempotencyKey:string}):Promise<{externalId:string;status:string}>{
    if(input.type!=="deliver"&&input.type!=="support_confirmation")throw new Error("AGENTMAIL_ACTION_NOT_ALLOWED");
    if(this.env.AUTOMATON_ALLOW_CUSTOMER_DELIVERY!=="1")throw new Error("CUSTOMER_DELIVERY_DISABLED");
    const health=await this.health();if(!health.ready)throw new Error("AGENTMAIL_NOT_READY");
    const to=String(input.payload.to??"").trim(),subject=String(input.payload.subject??"").slice(0,180),text=String(input.payload.text??"").slice(0,20000),html=String(input.payload.html??"").slice(0,50000);
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)||!subject||!text)throw new Error("AGENTMAIL_DELIVERY_INVALID");
    const inbox=encodeURIComponent(this.env.AUTOMATON_AGENTMAIL_INBOX_ID!),key=(this.env.AUTOMATON_AGENTMAIL_API_KEY||this.env.AGENTMAIL_API_KEY)!;
    const response=await fetch(`https://api.agentmail.to/v0/inboxes/${inbox}/messages/send`,{method:"POST",headers:{authorization:`Bearer ${key}`,"content-type":"application/json",accept:"application/json","idempotency-key":input.idempotencyKey},body:JSON.stringify({to:[to],subject,text,html:html||undefined,labels:["customer-delivery",input.type] }),signal:AbortSignal.timeout(15000)});
    const body:any=await response.json().catch(()=>({}));if(!response.ok)throw new Error(`AGENTMAIL_SEND_ERROR:${response.status}:${String(body?.detail??body?.message??"").slice(0,300)}`);
    return{externalId:String(body.message_id??body.id??input.idempotencyKey),status:"sent"};
  }
}

