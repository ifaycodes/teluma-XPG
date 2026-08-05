from sqlalchemy.orm import Session
from models import Notification


def notify(db: Session, user_id: str, notif_type: str, title: str, message: str = None) -> Notification:
    n = Notification(user_id=user_id, type=notif_type, title=title, message=message)
    db.add(n)
    db.commit()
    return n
