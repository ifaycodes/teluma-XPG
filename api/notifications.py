from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import verify_token
from database import get_db
from models import Notification

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/")
def list_notifications(
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token),
):
    notifications = db.query(Notification).filter_by(user_id=user_id).order_by(
        Notification.created_at.desc()
    ).limit(50).all()

    return [
        {
            "id": str(n.id),
            "type": n.type,
            "title": n.title,
            "message": n.message,
            "read": n.read_at is not None,
            "created_at": str(n.created_at),
        }
        for n in notifications
    ]


@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token),
):
    count = db.query(Notification).filter_by(user_id=user_id, read_at=None).count()
    return {"count": count}


@router.post("/{notification_id}/read")
def mark_read(
    notification_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token),
):
    notification = db.query(Notification).filter_by(id=notification_id, user_id=user_id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    if notification.read_at is None:
        notification.read_at = datetime.now(timezone.utc)
        db.commit()

    return {"id": str(notification.id), "read": True}


@router.post("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token),
):
    db.query(Notification).filter_by(user_id=user_id, read_at=None).update(
        {"read_at": datetime.now(timezone.utc)}
    )
    db.commit()
    return {"status": "ok"}
