import Database from "better-sqlite3";
import { DurableCommerceStore } from "/home/clawdbot/.openclaw/workspace/projects/oakhampton-automaton/dist/commerce/durable-store.js";
const db=new Database("/home/clawdbot/.openclaw/workspace/projects/oakhampton-automaton/data/commerce.db");
const store=new DurableCommerceStore(db);
const now=new Date().toISOString();
const unsuitable=/\b(in[- ]person|photo(?:graph| shoot)|video edit|logo design|3d render|architectural visualization|memorial service)\b/i;
let quarantined=0;
for(const row of db.prepare("select job_id,payload from commerce_jobs where type='submit_proposal' and status='queued'").all()){
  const payload=JSON.parse(row.payload);
  if(!unsuitable.test(String(payload.title??""))) continue;
  db.prepare("update commerce_jobs set status='completed',last_error=?,updated_at=? where job_id=? and status='queued'").run("CAPABILITY_MISMATCH_QUARANTINED",now,row.job_id);
  store.event(row.job_id,"proposal_quarantined",{title:payload.title,platformId:payload.platformId,reason:"CAPABILITY_MISMATCH"});
  quarantined++;
}
let requeued=0;
for(const row of db.prepare("select job_id,payload from commerce_jobs where type='submit_proposal' and json_extract(payload,'$.platformId') in ('ugig','dealwork','superteam-earn') and status='completed'").all()){
  const payload=JSON.parse(row.payload);
  store.enqueue("submit_proposal",payload,`owner-live-application:${row.job_id}:2026-07-22`,now,3);
  requeued++;
}
store.enqueue("discover",{trigger:"owner_live_application_launch",requestedAt:now},`discover:applications-live:${now}`);
console.log(JSON.stringify({quarantined,requeued,discoveryQueued:true,at:now}));
db.close();
