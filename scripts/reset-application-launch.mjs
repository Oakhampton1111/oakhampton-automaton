import Database from "better-sqlite3";
import { DurableCommerceStore } from "/home/clawdbot/.openclaw/workspace/projects/oakhampton-automaton/dist/commerce/durable-store.js";
const db=new Database("/home/clawdbot/.openclaw/workspace/projects/oakhampton-automaton/data/commerce.db");
const store=new DurableCommerceStore(db);
const now=new Date().toISOString();
let archived=0;
for(const row of db.prepare("select job_id,last_error,payload from commerce_jobs where type='submit_proposal' and (last_error='DAILY_PROPOSAL_CAP' or (json_extract(payload,'$.platformId')='ugig' and json_extract(payload,'$.title') in ('Source-cited evidence brief for research QA ops','AI Operations Manager — Your AI Agents Running 24/7 While You Focus','JiSensing Agent — Phase Transition Signal Detection')))").all()){
  db.prepare("update commerce_jobs set status='completed',last_error=?,lease_owner=null,lease_expires_at=null,updated_at=? where job_id=?").run("ARCHIVED_PRE_LAUNCH_OR_SELF_LISTING",now,row.job_id);
  store.event(row.job_id,"proposal_archived",{reason:"PRE_LAUNCH_CAP_OR_SELF_LISTING"});
  archived++;
}
db.prepare("insert into commerce_daily_actions(day,action,count) values(date('now'),'submit_proposal',0) on conflict(day,action) do update set count=0").run();
for(const item of store.listState("proposal-cap:")) store.deleteState(item.key);
store.enqueue("discover",{trigger:"clean_live_application_launch",requestedAt:now},`discover:clean-live:${now}`);
console.log(JSON.stringify({archived,dailyApplicationCountReset:true,discoveryQueued:true,at:now}));
db.close();
