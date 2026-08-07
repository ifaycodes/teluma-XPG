"""
One-off setup script — run this yourself once, with your own Bachs API key,
to create the three subscription products behind Teluma's pricing tiers.

Usage:
    BACHS_API_KEY=sk_sandbox_... python scripts/create_bachs_products.py

Paste the resulting prod_... IDs into your .env as BACHS_PRODUCT_BASIC,
BACHS_PRODUCT_PRO, and BACHS_PRODUCT_ENTERPRISE.

Note: Bachs only supports USD or NGN as a product's *primary* currency, and
subscriptions only bill in USD today — NGN can't be a recurring product's
primary currency, and can't be added as a currency_option on a USD-primary
product either (currency_options are for other currencies like GHS/KES, not
for the other one of the two primary-eligible currencies). So these are
created USD-primary with no currency_options; the NGN price on the landing
page is display-only. If you ever need to change a product's currency after
creation, note that Bachs rejects that via PATCH — you have to create a new
product (see the archived Basic/Pro/Enterprise products from 2026-08-06).
"""
import os
import sys

import httpx

BACHS_API_KEY = os.getenv("BACHS_API_KEY")
BACHS_BASE_URL = os.getenv("BACHS_BASE_URL", "https://sandbox-api.bachs.io")

PLANS = [
    {
        "name": "Starter",
        "description": "For small teams running a targeted funding pipeline.",
        "amount_usd": "10.00",
        "metadata": {"tier": "basic"},
    },
    {
        "name": "Pro",
        "description": "For active teams applying to every qualified grant.",
        "amount_usd": "25.00",
        "metadata": {"tier": "pro"},
    },
    {
        "name": "Agency / Consultant",
        "description": "For grant writers, consultants, and multi-program NGOs.",
        "amount_usd": "80.00",
        "metadata": {"tier": "enterprise"},
    },
]


def main():
    if not BACHS_API_KEY:
        print("Set BACHS_API_KEY before running this script.", file=sys.stderr)
        sys.exit(1)

    headers = {
        "Authorization": f"Bearer {BACHS_API_KEY}",
        "Content-Type": "application/json",
    }

    with httpx.Client(base_url=BACHS_BASE_URL, timeout=15) as client:
        for plan in PLANS:
            payload = {
                "name": f"Teluma {plan['name']}",
                "description": plan["description"],
                "price": {
                    "currency": "USD",
                    "amount": plan["amount_usd"],
                },
                "billing_cycle": {"interval": "month", "frequency": 1},
                "metadata": plan["metadata"],
            }
            resp = client.post("/v1/products", json=payload, headers=headers)
            resp.raise_for_status()
            product = resp.json()
            print(f"{plan['name']}: {product['id']}  (env var BACHS_PRODUCT_{plan['metadata']['tier'].upper()})")


if __name__ == "__main__":
     main()
