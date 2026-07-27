# Agent Desk visibility site

Source-controlled public site, Insights publication, metadata generator, safety gates and deployment tooling for `https://www.oakhampton.ai/automation-services/`.

## Commands

```bash
python3 scripts/build_visibility.py
python3 scripts/validate_site.py
python3 scripts/publish_next.py --dry-run
```

Production deployment is performed by `scripts/deploy.sh`. It validates a staged copy before atomically switching the live directory. The weekly publisher quarantines unsafe or unsupported drafts rather than publishing them.

