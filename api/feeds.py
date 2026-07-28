import json

from fastapi import APIRouter, Depends, Query, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from agents.runner import run_agent
from database import get_db
from models import UserGrant, Grant, User, ApplicationTracker, VaultDocument
from auth import verify_token
from storage import upload_file, get_signed_url, GCS_BUCKET_AGENT, GCS_BUCKET_VAULT
from utils.pdf_generator import generate_grants_pdf
from typing import Optional
from uuid import UUID
import uuid

router = APIRouter(
    prefix="/feeds",
    tags=["feeds"]
)

@router.get("/")
def get_feeds(
    amount: Optional[str] = Query(None),
    deadline: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    query = db.query(UserGrant).filter_by(UserGrant.user_id == user_id)

    if amount:
        query = query.join(Grant).filter(Grant.amount == amount)
    if deadline:
        query = query.join(Grant).filter(Grant.deadline <= deadline)

    results = query.all()

    feed = {
        "recommended": [],
        "strong_fit": [],
        "not_qualified": []
    }

    for ug in results:
        feed[ug.fit_category].append({
            "id": str(ug.grant.id),
            "name": ug.grant.name,
            "amount": ug.grant.amount,
            "deadline": str(ug.grant.deadline),
            "link": ug.grant.link,
            "applied": ug.applied
        })

    return feed

@router.post("/submit")
async def submit_grant(
    name: str,
    link: Optional[str] = None,
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):

    # save a grant
    grant = Grant(name=name, link=link, source="user_submitted")
    db.add(grant)
    db.commit()
    db.refresh(grant)

    gcs_path = None
    if file:
        contents = await file.read()
        gcs_path = f"user-vault/{user_id}/grants/{uuid.uuid4()}_{file.filename}"
        upload_file(
            contents=contents,
            destination_path=gcs_path,
            bucket_name=GCS_BUCKET_VAULT,
            content_type=file.content_type
        )

    prompt = f"""
        Evaluate this grant for the user:
        Grant name: {name}
        Grant link: {link or 'not provided'}
        Grant document: {gcs_path or 'not provided'}
        
        Check the organization's vault documents and evaluate fit.
        Return JSON with:
        - fit_category: recommended | strong_fit | not_qualified
        - reason: brief explanation
        - amount: grant amount if found
        - deadline: grant deadline if found
        - description: brief grant description
    """

    try:
        response = await run_agent(prompt, user_id=user_id)
        result = json.loads(response)

        # update grant with evaluated result details
        grant.amount = result.get("amount")
        grant.description = result.get("description")
        fit_category = result.get("fit_category", "not_qualified")

        # save to user_grants
        user_grant = UserGrant(
            user_id=user_id,
            grant_id=grant.id,
            fit_category=fit_category,
        )
        db.add(user_grant)
        db.commit()

        # auto trigger application if fit
        application = None
        if fit_category in ["recommended", "strong_fit"]:
            application = await start_application(grant, user_id, db)
            user_grant.applied = True
            db.commit()

    except Exception as e:
        # still save the grant even if agent fails
        db.commit()
        return {
            "grant_id": str(grant.id),
            "status": "saved",
            "warning": f"Agent evaluation failed: {str(e)}"
        }
    return {
        "grant_id": str(grant.id),
        "fit_category": fit_category,
        "status": application.status if application else "not_qualified",
        "application_id": str(application.id) if application else None,
        "message": "Grant evaluated and application started" if application else "Grant saved but not qualified for application"
    }

@router.post("/{grant_id}/apply")
async def apply_for_grant(
    grant_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    grant = db.query(Grant).filter_by(id=grant_id).first()
    if not grant:
        raise HTTPException(status_code=404, detail="Grant not found")

    #check if grant is on their feed
    user_grant = db.query(UserGrant).filter_by(
        grant_id = UUID(grant_id),
        user_id = UUID(user_id)
    ).first()

    if not user_grant:
        raise HTTPException(status_code=404, detail="Grant not found on your feed")


    application = await start_application(grant, user_id, db)

    user_grant.applied = True
    db.commit()

    return {
        "application_id": str(application.id),
        "status": application.status,
        "grant_id": grant_id,
        "outline_gcs_path": application.outline_gcs_path
    }

@router.get("/export")
def export_grants(
        db: Session = Depends(get_db),
        user_id: str = Depends(verify_token)
):
    # get user
    user = db.query(User).filter_by(id=user_id).first()

    # get all grants grouped
    results = db.query(UserGrant).filter(
        UserGrant.user_id == user_id
    ).all()

    feed = {"recommended": [], "strong_fit": [], "not_qualified": []}
    for ug in results:
        feed[ug.fit_category].append({
            "name": ug.grant.name,
            "amount": ug.grant.amount,
            "deadline": str(ug.grant.deadline) if ug.grant.deadline else "—",
            "link": ug.grant.link or "—"
        })

    # generate pdf
    pdf_bytes = generate_grants_pdf(grants=feed, user_name=user.full_name or user.email)

    # upload to GCS
    gcs_path = f"exports/{user_id}/{uuid.uuid4()}_grants.pdf"
    upload_file(
        contents=pdf_bytes,
        destination_path=gcs_path,
        bucket_name=GCS_BUCKET_AGENT,
        content_type="application/pdf"
    )

    # return signed url
    url = get_signed_url(
        gcs_path=gcs_path,
        bucket_name=GCS_BUCKET_AGENT,
        expiration_minutes=30
    )
    return {"download_url": url}

async def start_application(grant, user_id: str, db: Session):
    application = ApplicationTracker(
        user_id=user_id,
        grant_id=grant.id,
        status="outline_in_progress"
    )
    db.add(application)
    db.commit()
    db.refresh(application)

    # pull vault documents for context
    vault_docs = db.query(VaultDocument).filter_by(user_id=user_id).all()
    vault_context = [
        {"name": doc.name, "tag": doc.tag, "gcs_path": doc.gcs_path}
        for doc in vault_docs
    ]

    # trigger ag3
    prompt = f"""
        Start application flow for this grant:
        Grant: {grant.name}
        Amount: {grant.amount}
        Deadline: {grant.deadline}
        Description: {grant.description}
        Link: {grant.link}
        
        Organization vault documents available:
        {json.dumps(vault_context)}

        Generate a proposal outline.
    """

    response, _ = await run_agent(
        prompt=prompt,
        user_id=user_id,
        session_id=str(application.id)
    )

    outline_path = f"applications/{user_id}/{application.id}/outline.json"
    upload_file(
        contents=response.encode(),
        destination_path=outline_path,
        bucket_name=GCS_BUCKET_VAULT,
        content_type="application/json"
    )

    application.output_gcs_path = outline_path
    application.status = "outline_review"
    db.commit()

    return application
