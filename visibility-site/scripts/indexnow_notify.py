#!/usr/bin/env python3
import json, urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
key=(ROOT/'state/indexnow_key.txt').read_text().strip()
manifest=json.loads((ROOT/'state/content_manifest.json').read_text())
urls=manifest.get('public_urls',[])+['https://www.oakhampton.ai/automation-services/sitemap.xml']
payload=json.dumps({'host':'www.oakhampton.ai','key':key,'keyLocation':f'https://www.oakhampton.ai/automation-services/indexnow-key.txt','urlList':urls[:10000]}).encode()
req=urllib.request.Request('https://api.indexnow.org/indexnow',data=payload,headers={'Content-Type':'application/json; charset=utf-8'})
with urllib.request.urlopen(req,timeout=30) as response: print('IndexNow',response.status,len(urls))
