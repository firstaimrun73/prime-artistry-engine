#!/usr/bin/env python3
"""
Motio2edit — create PayPal Catalog product + 5 monthly billing plans + webhook.

SAFE DEFAULT: sandbox only.
Does NOT charge anyone. Does NOT convert existing customers.

Usage:
  export PAYPAL_CLIENT_ID="..."          # Sandbox app client id
  export PAYPAL_CLIENT_SECRET="..."      # Sandbox app secret
  # optional:
  export PAYPAL_API_URL="https://api-m.sandbox.paypal.com"
  export WEBHOOK_URL="https://motio2edit.com/api/public/webhooks/paypal"

  python3 scripts/paypal-create-subscriptions-catalog.py

Then paste printed PAYPAL_PLAN_* and PAYPAL_WEBHOOK_ID into Vercel (sandbox first).
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from typing import Any

API_BASE = os.environ.get("PAYPAL_API_URL", "https://api-m.sandbox.paypal.com").rstrip("/")
CLIENT_ID = os.environ.get("PAYPAL_CLIENT_ID", "").strip()
CLIENT_SECRET = os.environ.get("PAYPAL_CLIENT_SECRET", "").strip()
WEBHOOK_URL = os.environ.get(
    "WEBHOOK_URL", "https://motio2edit.com/api/public/webhooks/paypal"
).strip()

# Must match src/lib/plans.ts DISPLAY_PRICES + PLAN_CREDITS and payments.server PAYPAL_PLAN_* keys
PLANS = [
    {"key": "LITE", "name": "Motio2edit Lite", "description": "350 credits / month", "price": "4.99"},
    {"key": "PLUS", "name": "Motio2edit Plus", "description": "800 credits / month", "price": "9.99"},
    {"key": "PRO", "name": "Motio2edit Pro", "description": "2500 credits / month", "price": "29.99"},
    {"key": "STUDIO", "name": "Motio2edit AI Studio", "description": "5000 credits / month", "price": "55.00"},
    {"key": "BUSINESS", "name": "Motio2edit Master Studio", "description": "10000 credits / month", "price": "110.00"},
]

WEBHOOK_EVENT_TYPES = [
    "BILLING.SUBSCRIPTION.CREATED",
    "BILLING.SUBSCRIPTION.ACTIVATED",
    "BILLING.SUBSCRIPTION.CANCELLED",
    "BILLING.SUBSCRIPTION.SUSPENDED",
    "BILLING.SUBSCRIPTION.EXPIRED",
    "BILLING.SUBSCRIPTION.PAYMENT.FAILED",
    "PAYMENT.SALE.COMPLETED",
    "PAYMENT.CAPTURE.COMPLETED",
]


def die(msg: str, code: int = 1) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(code)


def request_json(
    method: str,
    path: str,
    token: str | None = None,
    body: dict[str, Any] | None = None,
    basic: tuple[str, str] | None = None,
) -> dict[str, Any]:
    url = f"{API_BASE}{path}"
    data = None if body is None else json.dumps(body).encode("utf-8")
    headers = {"Accept": "application/json"}
    if body is not None:
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if basic:
        import base64

        raw = f"{basic[0]}:{basic[1]}".encode("utf-8")
        headers["Authorization"] = "Basic " + base64.b64encode(raw).decode("ascii")
        headers["Content-Type"] = "application/x-www-form-urlencoded"
        data = b"grant_type=client_credentials"

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        die(f"{method} {path} -> HTTP {e.code}\n{err_body}")
    except Exception as e:  # noqa: BLE001
        die(f"{method} {path} failed: {e}")
    return {}  # unreachable


def access_token() -> str:
    if not CLIENT_ID or not CLIENT_SECRET:
        die("Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET (sandbox app).")
    if "sandbox" not in API_BASE and os.environ.get("ALLOW_LIVE_PAYPAL") != "1":
        die(
            f"Refusing non-sandbox API_BASE={API_BASE}. "
            "Use api-m.sandbox.paypal.com or set ALLOW_LIVE_PAYPAL=1 deliberately."
        )
    tok = request_json(
        "POST",
        "/v1/oauth2/token",
        basic=(CLIENT_ID, CLIENT_SECRET),
    )
    if "access_token" not in tok:
        die(f"No access_token in response: {tok}")
    return tok["access_token"]


def create_product(token: str) -> str:
    body = {
        "name": "Motio2edit Subscription",
        "description": "Monthly Motio2edit AI creative credits subscription",
        "type": "SERVICE",
        "category": "SOFTWARE",
    }
    res = request_json("POST", "/v1/catalogs/products", token=token, body=body)
    pid = res.get("id")
    if not pid:
        die(f"Product create missing id: {res}")
    print(f"Product ID: {pid}")
    return pid


def create_plan(token: str, product_id: str, plan: dict[str, str]) -> str:
    body = {
        "product_id": product_id,
        "name": plan["name"],
        "description": plan["description"],
        "status": "ACTIVE",
        "billing_cycles": [
            {
                "frequency": {"interval_unit": "MONTH", "interval_count": 1},
                "tenure_type": "REGULAR",
                "sequence": 1,
                "total_cycles": 0,  # infinite until cancel
                "pricing_scheme": {
                    "fixed_price": {"value": plan["price"], "currency_code": "USD"}
                },
            }
        ],
        "payment_preferences": {
            "auto_bill_outstanding": True,
            "setup_fee": {"value": "0", "currency_code": "USD"},
            "setup_fee_failure_action": "CONTINUE",
            "payment_failure_threshold": 3,
        },
    }
    res = request_json("POST", "/v1/billing/plans", token=token, body=body)
    pid = res.get("id")
    if not pid:
        die(f"Plan create missing id for {plan['key']}: {res}")
    print(f"  PAYPAL_PLAN_{plan['key']}={pid}  ({plan['name']} ${plan['price']}/mo)")
    return pid


def create_webhook(token: str) -> str:
    body = {
        "url": WEBHOOK_URL,
        "event_types": [{"name": n} for n in WEBHOOK_EVENT_TYPES],
    }
    res = request_json("POST", "/v1/notifications/webhooks", token=token, body=body)
    wid = res.get("id")
    if not wid:
        # webhook may already exist for this URL
        die(
            f"Webhook create failed (maybe URL already registered). Response:\n{json.dumps(res, indent=2)}\n"
            "List existing: GET /v1/notifications/webhooks"
        )
    print(f"Webhook ID: {wid}")
    print(f"Webhook URL: {WEBHOOK_URL}")
    return wid


def main() -> None:
    print(f"API base: {API_BASE}")
    print(f"Webhook URL: {WEBHOOK_URL}")
    print("—")
    token = access_token()
    print("Auth OK")

    product_id = create_product(token)
    plan_ids: dict[str, str] = {}
    print("Plans:")
    for p in PLANS:
        plan_ids[p["key"]] = create_plan(token, product_id, p)

    webhook_id = create_webhook(token)

    print("\n======== Vercel env (sandbox) ========")
    print(f"PAYPAL_API_URL={API_BASE}")
    print(f"PAYPAL_CLIENT_ID={CLIENT_ID}")
    print("# PAYPAL_CLIENT_SECRET=<keep secret, do not commit>")
    print(f"PAYPAL_WEBHOOK_ID={webhook_id}")
    for k, v in plan_ids.items():
        print(f"PAYPAL_PLAN_{k}={v}")
    print("FRONTEND_URL=https://motio2edit.com")
    print("=====================================")
    print(
        "\nNext: set these on Vercel (Preview/sandbox first), apply Supabase migration,"
        " then test: subscribe → ACTIVATED → credits → cancel."
    )
    print("Do NOT switch PAYPAL_API_URL to live until sandbox renewal is verified.")


if __name__ == "__main__":
    main()
