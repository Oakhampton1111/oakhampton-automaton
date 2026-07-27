#!/usr/bin/env python3
"""Read-only and non-financial production smoke checks for Agent Desk."""

from __future__ import annotations

import argparse
import json
import ssl
import sys
import urllib.error
import urllib.request
import uuid


def request(
    base_url: str,
    path: str,
    *,
    method: str = "GET",
    body: dict[str, object] | None = None,
    headers: dict[str, str] | None = None,
) -> tuple[int, dict[str, str], bytes]:
    payload = json.dumps(body).encode() if body is not None else None
    merged_headers = {"User-Agent": "Oakhampton-Agent-Desk-Smoke/1.0"}
    if body is not None:
        merged_headers["Content-Type"] = "application/json"
    merged_headers.update(headers or {})
    req = urllib.request.Request(
        f"{base_url.rstrip('/')}{path}",
        data=payload,
        headers=merged_headers,
        method=method,
    )
    try:
        with urllib.request.urlopen(
            req, timeout=15, context=ssl.create_default_context()
        ) as response:
            return (
                response.status,
                {key.lower(): value for key, value in response.headers.items()},
                response.read(),
            )
    except urllib.error.HTTPError as error:
        return (
            error.code,
            {key.lower(): value for key, value in error.headers.items()},
            error.read(),
        )


def expect(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--base-url", default="https://www.oakhampton.ai", help="Origin to test"
    )
    parser.add_argument(
        "--skip-headers",
        action="store_true",
        help="Allow execution before the root-owned Caddy header change",
    )
    parser.add_argument(
        "--skip-intake",
        action="store_true",
        help="Do not create the controlled, non-financial QA intake",
    )
    args = parser.parse_args()

    checked: list[str] = []
    pages: dict[str, str] = {}
    for path in (
        "/automation-services/agent-desk/",
        "/automation-services/book/",
        "/automation-services/pricing.json",
        "/automation-services/assets/concierge.js",
    ):
        status, response_headers, raw = request(args.base_url, path)
        expect(status == 200, f"{path} returned HTTP {status}")
        text = raw.decode("utf-8")
        pages[path] = text
        checked.append(path)
        if path.endswith("/agent-desk/") and not args.skip_headers:
            for required in (
                "strict-transport-security",
                "content-security-policy",
                "permissions-policy",
                "x-content-type-options",
            ):
                expect(
                    required in response_headers,
                    f"{path} is missing {required}",
                )

    combined = "\n".join(pages.values())
    for banned in (
        "\x13",
        "Â",
        "Ã",
        "delivery stays fast and profitable",
        "automation stack executes the work",
        "human escalation at risk or commitment gates",
        "founding price",
    ):
        expect(banned not in combined, f"customer-facing output contains {banned!r}")

    pricing = json.loads(pages["/automation-services/pricing.json"])
    expect(len(pricing["offers"]) == 9, "pricing manifest must contain nine offers")
    concierge = pages["/automation-services/assets/concierge.js"]
    for offer in pricing["offers"]:
        if offer["billing"] != "once":
            continue
        amount = str(offer["checkout_price"]).removeprefix("AUD ")
        expect(
            amount in concierge,
            f"concierge is missing {offer['id']} price {amount}",
        )

    if not args.skip_intake:
        idempotency_key = f"agent-desk-smoke-{uuid.uuid4()}"
        intake = {
            "email": "qa.agentdesk@oakhampton.ai",
            "problem": (
                "Controlled Agent Desk production smoke request. "
                "No customer response, payment or fulfilment is required."
            ),
            "offerId": "agent-desk-custom",
            "campaignId": "production-smoke",
            "language": "en",
            "website": "",
        }
        first_status, _, first_raw = request(
            args.base_url,
            "/api/commerce/intake",
            method="POST",
            body=intake,
            headers={"Idempotency-Key": idempotency_key},
        )
        second_status, _, second_raw = request(
            args.base_url,
            "/api/commerce/intake",
            method="POST",
            body=intake,
            headers={"Idempotency-Key": idempotency_key},
        )
        first = json.loads(first_raw)
        second = json.loads(second_raw)
        expect(first_status == 202, f"valid intake returned HTTP {first_status}")
        expect(second_status == 202, f"repeated intake returned HTTP {second_status}")
        expect(
            first.get("reference") == second.get("reference"),
            "intake idempotency returned different references",
        )

        invalid_status, _, _ = request(
            args.base_url,
            "/api/commerce/intake",
            method="POST",
            body={**intake, "problem": "short"},
        )
        expect(invalid_status == 400, f"invalid intake returned HTTP {invalid_status}")

        privileged_status, _, _ = request(
            args.base_url, "/api/commerce/operations"
        )
        expect(
            privileged_status == 401,
            f"privileged operations returned HTTP {privileged_status}",
        )

    print(
        json.dumps(
            {
                "ok": True,
                "baseUrl": args.base_url,
                "checked": checked,
                "headersRequired": not args.skip_headers,
                "intakeChecked": not args.skip_intake,
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (AssertionError, json.JSONDecodeError, urllib.error.URLError) as error:
        print(json.dumps({"ok": False, "error": str(error)}), file=sys.stderr)
        raise SystemExit(1)
