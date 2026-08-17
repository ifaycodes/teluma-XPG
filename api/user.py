from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models import User, UserGrant, ApplicationTracker, VaultDocument
from auth import verify_token, get_current_supabase_user
from utils.email_client import send_welcome_email

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

profile_router = APIRouter(prefix="/user", tags=["user"])


@profile_router.post("/me")
async def ensure_profile(
    db: Session = Depends(get_db),
    supabase_user=Depends(get_current_supabase_user)
):
    user = db.query(User).filter_by(id=supabase_user.id).first()
    if not user:
        metadata = supabase_user.user_metadata or {}
        user = User(
            id=supabase_user.id,
            email=supabase_user.email,
            full_name=metadata.get("full_name"),
            organization_type=metadata.get("organization_type"),
            area_of_focus=metadata.get("area_of_focus"),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        await send_welcome_email(user.email, user.full_name)

    return {
        "id": str(user.id),
        "full_name": user.full_name,
        "email": user.email,
        "plan": user.plan,
        "plan_selected": user.plan_selected,
    }


@profile_router.post("/select-free")
def select_free_plan(
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token),
):
    """The free-trial choice from the plan picker — paid tiers go through
    /billing/checkout instead, so this only ever sets the free plan."""
    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.plan = "free"
    user.plan_selected = True
    db.commit()

    return {"plan": user.plan, "plan_selected": user.plan_selected}


class ProfileUpdate(BaseModel):
    full_name: str


@profile_router.patch("/profile")
def update_profile(
    body: ProfileUpdate,
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token),
):
    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    name = body.full_name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name can't be empty")

    user.full_name = name
    db.commit()

    return {"full_name": user.full_name}


@router.get("/")
def get_dashboard(
        db: Session = Depends(get_db),
        user_id: str = Depends(verify_token)
):
    user = db.query(User).filter_by(id=user_id).first()

    total_grants = db.query(UserGrant).filter_by(user_id=user_id).count()

    pending_statuses = [
        "pending",
        "outline_in_progress",
        "outline_review",
        "proposal_in_progress",
        "proposal_review",
    ]

    pending = db.query(ApplicationTracker).filter(
        ApplicationTracker.user_id == user_id, ApplicationTracker.status.in_(pending_statuses)
    ).count()

    submitted = db.query(ApplicationTracker).filter_by(
        user_id=user_id, status="submitted"
    ).count()

    vault_count = db.query(VaultDocument).filter_by(user_id=user_id).count()

    return {
        "user": {
            "full_name": user.full_name,
            "email": user.email,
            "plan": user.plan,
            "organization_type": user.organization_type,
        },
        "storage": {
            "used_bytes": user.storage_used_bytes,
            "limit_bytes": user.storage_limit_bytes,
            "used_mb": round(user.storage_used_bytes / (1024 * 1024), 2),
            "limit_mb": round(user.storage_limit_bytes / (1024 * 1024), 2),
        },
        "stats": {
            "total_grants": total_grants,
            "applications_pending": pending,
            "applications_submitted": submitted,
            "vault_documents": vault_count
        }
    }