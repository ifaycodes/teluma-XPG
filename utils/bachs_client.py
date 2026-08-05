import hashlib
import hmac
import os
import time

import httpx

BACHS_API_KEY = os.getenv("BACHS_API_KEY")
BACHS_BASE_URL = os.getenv("BACHS_BASE_URL", "https://sandbox-api.bachs.io")
BACHS_WEBHOOK_SECRET = os.getenv("BACHS_WEBHOOK_SECRET", "")

# plan tiers match the pricing page: basic=Starter, pro=Pro, enterprise=Agency/Consultant
PLAN_PRODUCTS = {
    "basic": os.getenv("BACHS_PRODUCT_BASIC"),
    "pro": os.getenv("BACHS_PRODUCT_PRO"),
    "enterprise": os.getenv("BACHS_PRODUCT_ENTERPRISE"),
}
PRODUCT_PLANS = {v: k for k, v in PLAN_PRODUCTS.items() if v}


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {BACHS_API_KEY}",
        "Content-Type": "application/json",
    }


async def create_checkout_session(
    plan: str,
    customer_email: str,
    customer_name: str | None,
    user_id: str,
    success_url: str,
    cancel_url: str,
) -> dict:
    product_id = PLAN_PRODUCTS.get(plan)
    if not product_id:
        raise ValueError(f"No Bachs product configured for plan '{plan}'")

    customer = {"email": customer_email}
    if customer_name:
        customer["name"] = customer_name

    payload = {
        "customer": customer,
        "product_cart": [{"product_id": product_id}],
        "success_url": success_url,
        "cancel_url": cancel_url,
        "metadata": {"user_id": user_id, "plan": plan},
    }

    async with httpx.AsyncClient(base_url=BACHS_BASE_URL, timeout=15) as client:
        resp = await client.post("/v1/checkout-sessions", json=payload, headers=_headers())
        resp.raise_for_status()
        return resp.json()


async def create_portal_session(bachs_customer_id: str) -> dict:
    async with httpx.AsyncClient(base_url=BACHS_BASE_URL, timeout=15) as client:
        resp = await client.post(
            f"/v1/customers/{bachs_customer_id}/portal-sessions",
            headers=_headers(),
        )
        resp.raise_for_status()
        return resp.json()


def verify_webhook_signature(
    raw_body: bytes,
    timestamp_header: str,
    signature_header: str,
    tolerance_seconds: int = 300,
) -> bool:
    """Mirrors Bachs's own verification example: HMAC-SHA256 of
    "{timestamp}.{raw_body}" using the endpoint's signing secret."""
    if not timestamp_header or not signature_header:
        return False
    try:
        timestamp = int(timestamp_header)
    except ValueError:
        return False
    if abs(time.time() - timestamp) > tolerance_seconds:
        return False

    message = f"{timestamp}.{raw_body.decode('utf-8')}"
    expected = hmac.new(
        BACHS_WEBHOOK_SECRET.encode(), message.encode("utf-8"), hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(expected, signature_header)
