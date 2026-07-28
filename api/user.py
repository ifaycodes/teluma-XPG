from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import User, UserGrant, ApplicationTracker, VaultDocument
from auth import verify_token

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


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