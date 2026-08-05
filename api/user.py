from fastapi import APIRouter, Depends
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
        user = User(
            id=supabase_user.id,
            email=supabase_user.email,
            full_name=(supabase_user.user_metadata or {}).get("full_name"),
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
    }


@router.get("/")
def get_dashboard(
        db: Session = Depends(get_db),
        user_id: str = Depends(verify_token)
):
    user = db.query(User).filter_by(id=user_id).first()

    total_grants = db.query(UserGrant).filter_by(user_id=user_id).count()

    pending = db.query(ApplicationTracker).filter_by(
        user_id=user_id, status="pending"
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