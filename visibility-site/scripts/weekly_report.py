#!/usr/bin/env python3
import json, urllib.request
from datetime import datetime, timezone
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; BASE="https://www.oakhampton.ai/automation-services"
checks={}
for path in ("/","/insights/","/sitemap.xml","/llms.txt","/agent-desk/"):
    try:
        with urllib.request.urlopen(BASE+path,timeout=15) as r: checks[path]={"status":r.status,"bytes":len(r.read())}
    except Exception as e: checks[path]={"error":str(e)}
report={"checked_at":datetime.now(timezone.utc).isoformat(),"endpoints":checks,"note":"Connect Search Console and Bing Webmaster exports when their verification credentials are available."}
out=ROOT/"state/weekly_reports"; out.mkdir(parents=True,exist_ok=True); p=out/(datetime.now().strftime("%Y-%m-%d")+".json"); p.write_text(json.dumps(report,indent=2),encoding="utf-8"); print(p)

