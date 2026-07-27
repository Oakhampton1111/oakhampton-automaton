import Database from "better-sqlite3";
import { DurableCommerceStore } from "/home/clawdbot/.openclaw/workspace/projects/oakhampton-automaton/dist/commerce/durable-store.js";
const db=new Database("/home/clawdbot/.openclaw/workspace/projects/oakhampton-automaton/data/commerce.db");
const store=new DurableCommerceStore(db);
const stamp=new Date().toISOString();
const job=store.enqueue("discover",{trigger:"owner_authorised_application_launch",requestedAt:stamp},`discover:owner-launch:${stamp}`);
console.log(JSON.stringify({jobId:job.jobId,status:job.status,requestedAt:stamp}));
db.close();
