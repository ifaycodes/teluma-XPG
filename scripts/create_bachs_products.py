
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
