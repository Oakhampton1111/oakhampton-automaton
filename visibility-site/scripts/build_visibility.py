#!/usr/bin/env python3
import html, json, re
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
BASE = "https://www.oakhampton.ai/automation-services"
OFFERS_PATH = ROOT.parent / "src" / "commerce" / "agent-desk-offers.json"

STYLE = """body{margin:0;font:17px/1.65 system-ui;color:#142334;background:#f7f9fb}a{color:#086967}.wrap{max-width:1040px;margin:auto;padding:0 22px}.nav{background:#102b3f;color:#fff;padding:18px 0}.nav a{color:#fff;margin-right:20px;text-decoration:none}.hero{padding:72px 0;background:#102b3f;color:#fff}.hero p{color:#d7e4eb;max-width:760px;font-size:20px}.ey{color:#76d5ce;text-transform:uppercase;letter-spacing:.14em;font-weight:800;font-size:12px}h1{font-size:clamp(38px,6vw,64px);line-height:1.05;letter-spacing:-.035em}h2{margin-top:42px}.section{padding:55px 0}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:20px}.card{background:#fff;border:1px solid #dce4ea;border-radius:15px;padding:24px}.btn{display:inline-block;background:#0d7b78;color:#fff;padding:13px 18px;border-radius:8px;text-decoration:none;font-weight:750}.meta{color:#687786;font-size:14px}.answer{font-size:21px;border-left:4px solid #0d7b78;padding-left:18px}.crumb{font-size:14px;margin:20px 0}footer{padding:28px 0;border-top:1px solid #dce4ea}@media(max-width:720px){.grid{grid-template-columns:1fr}}"""

def clean_text(s):
    replacements={
        chr(0xfffd):" - ",
        "Submitting securely&":"Submitting securely...",
        "Ãƒâ€šÃ‚Â·":"·",
        "Ãƒâ€šÃ‚·":"·",
        "Ã‚Â·":"·",
        "Â·":"·",
        "Â©":"©",
    }
    for a,b in replacements.items(): s=s.replace(a,b)
    return s

def aud(cents):
    return f"AUD ${cents // 100:,}"

def sync_offer_content(text, offers):
    common={
        "<h2>Scope before access</h2>":"<h2>What the package covers</h2>",
        "Credentials and sensitive source material are never accepted through public forms. Access is minimised and separately arranged after scope and payment.":"After scope and payment, we arrange the minimum secure access needed for delivery.",
        "Deliverables, exclusions, authority boundaries and acceptance checks are agreed before material work begins.":"We agree the deliverables, exclusions and acceptance checks before work begins.",
        "You receive working outputs, test evidence, limitations, documentation and a clean handover—not merely a chat transcript.":"You receive working outputs, test evidence, documentation and a clean handover.",
        "No. Unless expressly named and authorised, public examples are representative demonstrations. Operating Oakhampton products are separately identified as capability evidence.":"Examples are representative unless a named customer has approved publication.",
        "Design and prototype a persistent business agent with tools, authority limits, evaluation and human escalation.":"Design and prototype a persistent business agent with clear operating limits, evaluation and reliable hand-off.",
        "Workflow and authority-boundary design":"Workflow and operating-control design",
        "The package covers one bounded prototype with agreed tools, authority controls and an evaluation set.":"The package covers one focused prototype with agreed tools, operating controls and an evaluation set.",
        "Simple founding prices, GST included.":"Simple prices, GST included.",
        "Use this route when the work spans multiple systems, business units or material production risk. We will review the brief before confirming a call.":"Use this route when the work spans multiple systems or business units. We review the brief before confirming a call.",
    }
    for old,new in common.items():
        text=text.replace(old,new)
    match=re.search(r'<body data-offer="([^"]+)">',text)
    if match and match.group(1) in offers:
        offer_id=match.group(1); offer=offers[offer_id]
        primary=f'{aud(offer["amountAudCents"])} · {offer["leadTime"]}'
        text=re.sub(r'<div class="price"(?: data-offer-price="[^"]+")?>.*?</div>',f'<div class="price" data-offer-price="{offer_id}">{primary}</div>',text,count=1)
        text=re.sub(r'"description":\s*"AUD \$[0-9,]+"',f'"description": "{aud(offer["amountAudCents"])}"',text,count=1)
    support_headings={"support-monitor":"Monitor","support-maintain":"Maintain","support-managed":"Managed Agent"}
    for offer_id,heading in support_headings.items():
        text=re.sub(
            rf'(<h2>{re.escape(heading)}</h2><h3)(?: data-offer-price="[^"]+")?>(?:From )?AUD \$[0-9,]+/month</h3>',
            rf'\g<1> data-offer-price="{offer_id}">{aud(offers[offer_id]["amountAudCents"])}/month</h3>',
            text,
        )
    for offer_id,offer in offers.items():
        price=aud(offer["amountAudCents"])
        text=re.sub(
            rf'(<[^>]+data-offer-price="{re.escape(offer_id)}"[^>]*>)(?:From )?AUD \$[0-9,]+(.*?</[^>]+>)',
            rf'\g<1>{price}\g<2>',
            text,
        )
    if 'id="book"' in text:
        honeypot='<input name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-10000px">'
        text=re.sub(rf'(?:{re.escape(honeypot)})+',honeypot,text)
        if '<input name="website"' not in text:
            text=text.replace(
                '<form id="book">',
                '<form id="book">'+honeypot,
                1,
            )
        text=text.replace(
            'headers:{"content-type":"application/json"},body:JSON.stringify({email:f.get("email"),problem,offerId:"custom-agent",campaignId:"high-value-booking",language:"en"})',
            'headers:{"content-type":"application/json","idempotency-key":e.target.dataset.idempotencyKey||(e.target.dataset.idempotencyKey=crypto.randomUUID())},body:JSON.stringify({email:f.get("email"),problem,offerId:"custom-agent",campaignId:"high-value-booking",language:"en",website:String(f.get("website")||"")})',
        )
    return text

def build_concierge(offers):
    service_ids=["workflow-repair","openclaw-deployment","document-automation","api-integration","automation-diagnosis","custom-agent"]
    services=[]
    for offer_id in service_ids:
        offer=offers[offer_id]
        services.append({
            "id":offer_id,
            "name":offer["name"],
            "price":aud(offer["amountAudCents"]),
            "description":offer["conciergeDescription"],
            "keywords":offer["keywords"],
        })
    template=(ROOT/"assets/concierge.template.js").read_text(encoding="utf-8")
    output=template.replace("__AGENT_DESK_SERVICES__",json.dumps(services,separators=(",",":"),ensure_ascii=False))
    (PUBLIC/"assets").mkdir(exist_ok=True)
    (PUBLIC/"assets/concierge.js").write_text(output,encoding="utf-8")

def build_pricing(offers):
    payload={
        "currency":"AUD",
        "tax":"Published prices include Australian GST.",
        "offers":[
            {
                "id":offer_id,
                "name":offer["name"],
                "checkout_price":aud(offer["amountAudCents"]),
                "billing":offer["billing"],
                "delivery_target":offer["leadTime"],
            }
            for offer_id,offer in offers.items()
        ],
        "contact":"customerservice@oakhampton.ai",
        "scope":"The final scope, deliverables and acceptance checks are confirmed before work begins.",
    }
    (PUBLIC/"pricing.json").write_text(json.dumps(payload,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")

def metadata(title, desc, url, schema):
    return f'''<meta name="description" content="{html.escape(desc, quote=True)}"><link rel="canonical" href="{url}"><meta property="og:type" content="website"><meta property="og:site_name" content="Oakhampton Agent Desk"><meta property="og:title" content="{html.escape(title, quote=True)}"><meta property="og:description" content="{html.escape(desc, quote=True)}"><meta property="og:url" content="{url}"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="{html.escape(title, quote=True)}"><meta name="twitter:description" content="{html.escape(desc, quote=True)}"><script type="application/ld+json">{json.dumps(schema,separators=(',',':'))}</script>'''

def enhance_existing():
    offers=json.loads(OFFERS_PATH.read_text(encoding="utf-8"))
    org={"@context":"https://schema.org","@type":"Organization","name":"Oakhampton Capital Pty Ltd","url":"https://www.oakhampton.ai/","email":"customerservice@oakhampton.ai"}
    for path in PUBLIC.rglob("*.html"):
        text=clean_text(path.read_text(encoding="utf-8",errors="replace"))
        text=sync_offer_content(text,offers)
        descriptions=list(re.finditer(r'<meta name="description"[^>]*>',text,re.I))
        for duplicate in reversed(descriptions[1:]):
            text=text[:duplicate.start()]+text[duplicate.end():]
        rel=path.relative_to(PUBLIC).as_posix()
        if rel.startswith("delivery/") or rel.startswith("thank-you"):
            if 'name="robots"' not in text: text=text.replace("<head>",'<head><meta name="robots" content="noindex,nofollow">',1)
        if "canonical" not in text and "<head>" in text:
            url=BASE+"/"+("" if rel=="index.html" else rel.removesuffix("index.html"))
            title=re.search(r"<title>(.*?)</title>",text,re.I|re.S)
            title=html.unescape(title.group(1).strip()) if title else "Oakhampton Agent Desk"
            desc="Practical, fixed-scope AI automation and OpenClaw services from Oakhampton."
            text=text.replace("</head>",metadata(title,desc,url,org)+"</head>",1)
        path.write_text(text,encoding="utf-8")
    build_concierge(offers)
    build_pricing(offers)

def article_body(topic):
    title=html.escape(topic["title"]); summary=html.escape(topic["summary"]); service=topic["service"]
    return f'''<p class="answer">{summary}</p><h2>Start with the operational outcome</h2><p>Reliable automation begins with a measurable result, defined inputs and an explicit failure path. The implementation should not receive broader authority simply because a model can perform more actions.</p><h2>Use bounded stages</h2><p>Separate discovery, planning, execution and verification. Give each stage only the tools and data it needs. Record inputs, outputs, costs and approvals so a failed run can be diagnosed without repeating irreversible work.</p><h2>Verification before release</h2><p>Test the normal path, malformed inputs, unavailable dependencies, duplicated events and partial completion. Customer-facing output should retain source traceability and be reviewed by deterministic checks before it leaves the system.</p><h2>Where Oakhampton helps</h2><p>Agent Desk turns this pattern into a scoped implementation with acceptance tests and operating documentation.</p><p><a class="btn" href="{BASE}/{service}/">View the related service</a></p>'''

def build_insights():
    topics=json.loads((ROOT/"content/topics.json").read_text(encoding="utf-8")); today=date.today().isoformat(); cards=[]
    for t in topics:
        if t.get("status")!="ready": continue
        slug=t["slug"]; url=f"{BASE}/insights/{slug}/"; title=t["title"]
        schema={"@context":"https://schema.org","@type":"Article","headline":title,"description":t["summary"],"datePublished":today,"dateModified":today,"mainEntityOfPage":url,"author":{"@type":"Organization","name":"Oakhampton Agent Desk"},"publisher":{"@type":"Organization","name":"Oakhampton Capital Pty Ltd","url":"https://www.oakhampton.ai/"}}
        refs="".join(f'<li><a rel="nofollow noopener" href="{html.escape(x,quote=True)}">{html.escape(x)}</a></li>' for x in t["sources"])
        page=f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{html.escape(title)} | Agent Desk Insights</title>{metadata(title,t["summary"],url,schema)}<style>{STYLE}</style></head><body><nav class="nav"><div class="wrap"><a href="{BASE}/"><b>Oakhampton Agent Desk</b></a><a href="{BASE}/insights/">Insights</a><a href="{BASE}/agent-desk/">Submit a task</a></div></nav><main><div class="wrap"><div class="crumb"><a href="{BASE}/">Agent Desk</a> / <a href="{BASE}/insights/">Insights</a></div><article><div class="ey">Agent Desk Insights</div><h1>{html.escape(title)}</h1><p class="meta">Published {today} · Oakhampton Agent Desk</p>{article_body(t)}<h2>References</h2><ul>{refs}</ul></article></div></main><footer><div class="wrap">© 2026 Oakhampton Capital Pty Ltd · <a href="{BASE}/privacy.html">Privacy</a> · <a href="{BASE}/terms.html">Terms</a></div></footer></body></html>'''
        out=PUBLIC/"insights"/slug; out.mkdir(parents=True,exist_ok=True); (out/"index.html").write_text(page,encoding="utf-8")
        cards.append(f'<article class="card"><h2><a href="{url}">{html.escape(title)}</a></h2><p>{html.escape(t["summary"])}</p></article>')
    idx_url=f"{BASE}/insights/"; idx_schema={"@context":"https://schema.org","@type":"CollectionPage","name":"Agent Desk Insights","url":idx_url,"publisher":{"@type":"Organization","name":"Oakhampton Capital Pty Ltd"}}
    index=f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Agent Desk Insights | Practical AI automation engineering</title>{metadata("Agent Desk Insights","Evidence-led guidance for dependable AI automation and OpenClaw systems.",idx_url,idx_schema)}<style>{STYLE}</style></head><body><header class="hero"><div class="wrap"><div class="ey">Oakhampton</div><h1>Agent Desk Insights</h1><p>Evidence-led field notes for building dependable, commercially useful AI automation.</p><a class="btn" href="{BASE}/agent-desk/">Discuss a project</a></div></header><main class="section"><div class="wrap grid">{''.join(cards)}</div></main><footer><div class="wrap">© 2026 Oakhampton Capital Pty Ltd · <a href="{BASE}/">Services</a></div></footer></body></html>'''
    d=PUBLIC/"insights"; d.mkdir(exist_ok=True); (d/"index.html").write_text(index,encoding="utf-8")
    return topics

def feeds_and_maps(topics):
    urls=[]
    for p in PUBLIC.rglob("index.html"):
        rel=p.relative_to(PUBLIC).parent.as_posix(); url=BASE+("/" if rel=="." else f"/{rel}/")
        if not rel.startswith("delivery"): urls.append(url)
    for name in ("privacy.html","terms.html","llms.txt"): urls.append(f"{BASE}/{name}")
    today=date.today().isoformat(); sm='''<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'''+"\n".join(f"<url><loc>{html.escape(u)}</loc><lastmod>{today}</lastmod></url>" for u in sorted(set(urls)))+"\n</urlset>\n"
    (PUBLIC/"sitemap.xml").write_text(sm,encoding="utf-8")
    entries="".join(f'<entry><title>{html.escape(t["title"])}</title><id>{BASE}/insights/{t["slug"]}/</id><link href="{BASE}/insights/{t["slug"]}/"/><updated>{today}T00:00:00Z</updated><summary>{html.escape(t["summary"])}</summary></entry>' for t in topics if t.get("status")=="ready")
    feed=f'''<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Agent Desk Insights</title><id>{BASE}/insights/</id><updated>{today}T00:00:00Z</updated><link rel="self" href="{BASE}/insights/feed.xml"/>{entries}</feed>'''
    (PUBLIC/"insights"/"feed.xml").write_text(feed,encoding="utf-8")
    manifest={"generated_at":today,"canonical_base":BASE,"public_urls":sorted(set(urls)),"article_count":len(entries)}
    (ROOT/"state/content_manifest.json").write_text(json.dumps(manifest,indent=2),encoding="utf-8")

if __name__=="__main__":
    enhance_existing(); topics=build_insights(); feeds_and_maps(topics); print("visibility build complete")
