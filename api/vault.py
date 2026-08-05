from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import VaultDocument, User
from auth import verify_token
from storage import upload_file, get_signed_url, delete_file, GCS_BUCKET_VAULT
import uuid
from utils.limits import check_vault_limit

router = APIRouter(
    prefix="/vault",
    tags=["vault"]
)

MAX_UPLOAD_SIZE = 15 * 1024 * 1024 # 15MB

def get_user(user_id:str, db: Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/")
def get_documents(
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    docs = db.query(VaultDocument).filter(
        VaultDocument.user_id == user_id
    ).all()
    return docs

@router.get("/storage")
def get_storage_info(
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    user = get_user(user_id, db)
    return {
        "used_bytes": user.storage_used_bytes,
        "limit_bytes": user.storage_limit_bytes,
        "used_mb": round(user.storage_used_bytes / (1024 * 1024), 2),
        "limit_mb": round(user.storage_limit_bytes / (1024 * 1024), 2),
        "remaining_bytes": user.storage_limit_bytes - user.storage_used_bytes
    }

@router.post("/upload")
async def upload_document(
    name: str = Form(...),
    tag: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):

    user = db.query(User).filter_by(id=user_id).first()
    doc_count = db.query(VaultDocument).filter_by(user_id=user_id).count()
    check_vault_limit(user, doc_count)

    # get memory size by reading file into memory
    contents = await file.read()
    file_size = len(contents)

    # check single size limit
    if file_size > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File too large. Maximum size is 15MB"
        )

    # check user storage limit
    user = get_user(user_id, db)
    if user.storage_used_bytes + file_size > user.storage_limit_bytes:
        remaining = (user.storage_limit_bytes - user.storage_used_bytes) / (1024 * 1024)
        raise HTTPException(
            status_code=400,
            detail=f"Storage limit exceeded. You have {remaining:.2f}MB remaining."
        )

    gcs_path = f"vault/{user_id}/{uuid.uuid4()}_{file.filename}"
    upload_file(
        contents=contents,
        destination_path=gcs_path,
        bucket_name=GCS_BUCKET_VAULT,
        content_type=file.content_type
    )

    doc = VaultDocument(
        user_id=user_id,
        name=name,
        tag=tag,
        gcs_path=gcs_path,
        file_type=file.content_type,
        file_size_bytes=file_size
    )

    db.add(doc)
    user.storage_used_bytes += file_size
    db.commit()
    db.refresh(doc)

    return doc

@router.patch("/{doc_id}/rename")
def rename_document(
    doc_id: str,
    name: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    doc = db.query(VaultDocument).filter(
        VaultDocument.id == doc_id,
        VaultDocument.user_id == user_id
    ).first()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    doc.name = name
    db.commit()
    return {"status": "renamed document successfully", "name": doc.name}

@router.delete("/{doc_id}")
def delete_document(
    doc_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    doc = db.query(VaultDocument).filter(
        VaultDocument.id == doc_id,
        VaultDocument.user_id == user_id
    ).first()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    delete_file(gcs_path=doc.gcs_path, bucket_name=GCS_BUCKET_VAULT)

    # free up storage
    user = get_user(user_id, db)
    user.storage_used_bytes -= doc.file_size_bytes

    db.delete(doc)
    db.commit()
    return {"status": "deleted document successfully"}


@router.get("/{doc_id}/download")
def download_document(
    doc_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    doc = db.query(VaultDocument).filter_by(
        id=doc_id,
        user_id=user_id
    ).first()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    url = get_signed_url(
        gcs_path=doc.gcs_path,
        bucket_name=GCS_BUCKET_VAULT,
        expiration_minutes=30
    )
    return {"download_url": url}