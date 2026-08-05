import json
import os

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth import verify_token
from database import get_db
from models import User
from utils.bachs_client import (
    PRODUCT_PLANS,
    create_checkout_session,
    create_portal_session,
    verify_webhook_signature,
)
from utils.notify import notify

router = APIRouter(prefix="/billing", tags=["billing"])

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


class CheckoutRequest(BaseModel):
    plan: str


@router.post("/checkout")
async def start_checkout(
    body: CheckoutRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token),
):
    if body.plan not in ("basic", "pro", "enterprise"):
        raise HTTPException(status_code=400, detail="Invalid plan")

    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        session = await create_checkout_session(
            plan=body.plan,
            customer_email=user.email,
            customer_name=user.full_name,
            user_id=str(user.id),
            success_url=f"{FRONTEND_URL}/settings?checkout=success",
            cancel_url=f"{FRONTEND_URL}/settings?checkout=cancelled",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"checkout_url": session["checkout_url"]}


@router.post("/portal")
async def open_billing_portal(
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token),
):
    user = db.query(User).filter_by(id=user_id).first()
    if not user or not user.bachs_customer_id:
        raise HTTPException(status_code=400, detail="No billing account yet — subscribe to a plan first")

    session = await create_portal_session(user.bachs_customer_id)
    return {"portal_url": session["url"]}


@router.post("/webhook")
async def bachs_webhook(request: Request, db: Session = Depends(get_db)):
    raw_body = await request.body()
    timestamp = request.headers.get("x-bachs-timestamp", "")
    signature = request.headers.get("x-bachs-signature", "")

    if not verify_webhook_signature(raw_body, timestamp, signature):
        raise HTTPException(status_code=401, detail="Invalid signature")

    event = json.loads(raw_body)
    event_type = event.get("type")
    data = event.get("data", {}) or {}

    if event_type == "checkout.completed":
        _handle_checkout_completed(db, data)
    elif event_type == "customer.subscription.updated":
        _handle_subscription_updated(db, data)
    elif event_type == "customer.subscription.deleted":
        _handle_subscription_deleted(db, data)
    elif event_type == "collection.failed":
        _handle_collection_failed(db, data)

    return {"received": True}


def _handle_checkout_completed(db: Session, data: dict):
    if data.get("payment_status") not in ("paid", "no_payment_required"):
        return

    metadata = data.get("metadata") or {}
    user_id = metadata.get("user_id")
    plan = metadata.get("plan")
    if not user_id or not plan:
        return

    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        return

    customer = data.get("customer") or {}
    subscription = data.get("subscription") or {}

    user.plan = plan
    user.subscription_status = "active"
    if customer.get("customer_id"):
        user.bachs_customer_id = customer["customer_id"]
    if subscription.get("subscription_id"):
        user.bachs_subscription_id = subscription["subscription_id"]
    db.commit()

    notify(
        db, str(user.id), "success", "Subscription activated",
        f"You're now on the {plan.capitalize()} plan."
    )


def _handle_subscription_updated(db: Session, data: dict):
    user = _find_user_for_subscription(db, data)
    if not user:
        return

    plan = PRODUCT_PLANS.get(data.get("product_id"))
    if plan:
        user.plan = plan
    user.subscription_status = data.get("status")
    db.commit()


def _handle_subscription_deleted(db: Session, data: dict):
    user = _find_user_for_subscription(db, data)
    if not user:
        return

    user.plan = "free"
    user.subscription_status = "canceled"
    db.commit()

    notify(
        db, str(user.id), "info", "Subscription canceled",
        "Your subscription has ended. You're back on the Free plan."
    )


def _handle_collection_failed(db: Session, data: dict):
    customer = data.get("customer") or {}
    # collection.failed uses `id`, other events use `customer_id` — check both
    customer_id = customer.get("customer_id") or customer.get("id")
    user = db.query(User).filter_by(bachs_customer_id=customer_id).first() if customer_id else None
    if not user:
        return

    notify(
        db, str(user.id), "failure", "Payment failed",
        data.get("reason") or "We couldn't process your last payment. Please update your payment method."
    )


def _find_user_for_subscription(db: Session, data: dict):
    sub_id = data.get("subscription_id")
    user = db.query(User).filter_by(bachs_subscription_id=sub_id).first() if sub_id else None
    if user:
        return user
    customer = data.get("customer") or {}
    customer_id = customer.get("customer_id") or customer.get("id")
    if customer_id:
        return db.query(User).filter_by(bachs_customer_id=customer_id).first()
    return None
