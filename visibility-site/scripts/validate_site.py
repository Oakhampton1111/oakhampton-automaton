#!/usr/bin/env python3
import json, re, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; PUBLIC=ROOT/"public"; errors=[]
OFFERS_PATH=ROOT.parent/"src"/"commerce"/"agent-desk-offers.json"
try:
    offers=json.loads(OFFERS_PATH.read_text(encoding="utf-8"))
except Exception as e:
    offers={}
    errors.append(f"bad offer manifest: {e}")

def aud(cents):
    return f"AUD ${cents // 100:,}"

for p in PUBLIC.rglob("*"):
    if p.suffix.lower() not in {".html",".js",".css",".md",".txt",".json"}: continue
    s=p.read_text(encoding="utf-8",errors="replace"); rel=p.relative_to(PUBLIC).as_posix()
    controls=sorted({ord(c) for c in s if ord(c)<32 and c not in "\n\r\t"})
    if controls: errors.append(f"control characters {controls}: {rel}")
    for token in ("\ufffd","Â","Ãƒ","Ã‚"):
        if token in s: errors.append(f"mojibake token {token!r}: {rel}")
    if rel not in {"privacy.html","terms.html"}:
        for phrase in ("delivery stays fast and profitable","automation stack executes","risk or commitment gates","not legal, tax, medical or financial advice","not legal, tax, medical or regulated financial advice"):
            if phrase in s.lower(): errors.append(f"internal/defensive copy {phrase!r}: {rel}")
for p in PUBLIC.rglob("*.html"):
    s=p.read_text(encoding="utf-8",errors="replace"); rel=p.relative_to(PUBLIC).as_posix()
    if not rel.startswith(("delivery/","thank-you")):
        for required in ('rel="canonical"','application/ld+json'):
            if required not in s: errors.append(f"missing {required}: {rel}")
        descriptions=len(re.findall(r'<meta name="description"[^>]*>',s,re.I))
        if descriptions!=1: errors.append(f"expected one meta description, found {descriptions}: {rel}")
        for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>',s,re.S):
            try: json.loads(block)
            except Exception as e: errors.append(f"bad json-ld {rel}: {e}")
    ids=re.findall(r'\bid="([^"]+)"',s,re.I)
    duplicates=sorted({x for x in ids if ids.count(x)>1})
    if duplicates: errors.append(f"duplicate ids {duplicates}: {rel}")
    if rel=="agent-desk/index.html":
        if s.count("<div")!=s.count("</div>"): errors.append("unbalanced divs: agent-desk/index.html")
        for offer_id in ("automation-diagnosis","workflow-repair","openclaw-deployment","document-automation","api-integration","custom-agent"):
            count=len(re.findall(rf'<button[^>]+class="[^"]*\bbuy\b[^"]*"[^>]+data-offer="{re.escape(offer_id)}"',s))
            if count!=1: errors.append(f"expected one buy button for {offer_id}, found {count}")
        for phrase in ("profitable","automation stack","risk or commitment gates","No generic proposal","No silent overrun"):
            if phrase.lower() in s.lower(): errors.append(f"internal/defensive copy {phrase!r}: {rel}")
        if '"idempotency-key"' not in s: errors.append("Agent Desk intake missing idempotency key")
    if rel=="book/index.html" and '"idempotency-key"' not in s:
        errors.append("booking intake missing idempotency key")

for offer_id,offer in offers.items():
    price=aud(offer["amountAudCents"])
    matches=[]
    for p in PUBLIC.rglob("*.html"):
        s=p.read_text(encoding="utf-8",errors="replace")
        if f'data-offer-price="{offer_id}"' in s:
            matches.extend(re.findall(rf'<[^>]+data-offer-price="{re.escape(offer_id)}"[^>]*>(.*?)</[^>]+>',s,re.S))
    if not matches: errors.append(f"offer price not rendered from manifest: {offer_id}")
    for rendered in matches:
        if price not in rendered: errors.append(f"offer price mismatch {offer_id}: {rendered!r} != {price}")

concierge=(PUBLIC/"assets/concierge.js").read_text(encoding="utf-8",errors="replace") if (PUBLIC/"assets/concierge.js").exists() else ""
for offer_id in ("automation-diagnosis","workflow-repair","openclaw-deployment","document-automation","api-integration","custom-agent"):
    if offer_id not in concierge or aud(offers[offer_id]["amountAudCents"]) not in concierge:
        errors.append(f"concierge offer mismatch: {offer_id}")
for phrase in ("not legal, tax, medical or financial advice","profitable","risk or commitment gates"):
    if phrase.lower() in concierge.lower(): errors.append(f"concierge internal/defensive copy: {phrase!r}")
for private in (PUBLIC/"delivery",):
    for p in private.rglob("*.html") if private.exists() else []:
        if "noindex" not in p.read_text(encoding="utf-8",errors="replace"): errors.append(f"private indexable: {p}")
if not (PUBLIC/"sitemap.xml").exists(): errors.append("missing sitemap")
if not (PUBLIC/"insights/feed.xml").exists(): errors.append("missing feed")
if errors:
    print("\n".join(errors)); sys.exit(1)
count=sum(1 for _ in PUBLIC.rglob("*.html"))
print(f"PASS: {count} HTML pages validated")
