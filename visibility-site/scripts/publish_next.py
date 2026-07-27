#!/usr/bin/env python3
import argparse, json, re, subprocess, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; topics_path=ROOT/"content/topics.json"
SENSITIVE=re.compile(r"(password|private key|api[_ -]?key|secret|customer name|guaranteed return)",re.I)
def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--dry-run",action="store_true"); a=ap.parse_args()
    topics=json.loads(topics_path.read_text(encoding="utf-8")); candidates=[t for t in topics if t.get("status")=="draft"]
    if not candidates: print("No approved draft queued; safe no-op"); return
    t=candidates[0]; blob=json.dumps(t)
    reasons=[]
    if SENSITIVE.search(blob): reasons.append("sensitive or unsupported claim")
    if len(t.get("sources",[]))<1: reasons.append("no authoritative source")
    if reasons:
        t["status"]="quarantined"; t["quarantine_reasons"]=reasons
    elif not a.dry_run: t["status"]="ready"
    if not a.dry_run: topics_path.write_text(json.dumps(topics,indent=2)+"\n",encoding="utf-8")
    if reasons: print("QUARANTINED: "+", ".join(reasons)); return
    if a.dry_run: print("DRY RUN PASS: "+t["slug"]); return
    subprocess.run([sys.executable,str(ROOT/"scripts/build_visibility.py")],check=True)
    subprocess.run([sys.executable,str(ROOT/"scripts/validate_site.py")],check=True)
    print("READY FOR DEPLOYMENT: "+t["slug"])
if __name__=="__main__": main()

