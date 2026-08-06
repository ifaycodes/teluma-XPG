import json

from fastapi import APIRouter, Depends, Query, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session

from agents.runner import run_agent
from agents.ag2_evaluation import evaluation_agent
from agents.ag3_outline import outline_agent
from agents.application_flow import start_application
from utils.limits import check_can_apply, check_agent_runs
from database import get_db
from models import UserGrant, Grant, User, VaultDocument
from auth import verify_token
from storage import upload_file, get_signed_url, GCS_BUCKET_AGENT, GCS_BUCKET_VAULT
from utils.pdf_generator import generate_grants_pdf
from utils.limits import get_feed_limit
from utils.parsing import extract_json, parse_deadline
from typing import Optional
from uuid import UUID
import uuid

router = APIRouter(
    prefix="/feeds",
    tags=["feeds"]
)

VALID_FIT_CATEGORIES = {"prime_match", "moderate_fit", "low_probability"}

@router.get("/")
def get_feeds(
    amount: Optional[str] = Query(None),
    deadline: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    user = db.query(User).filter_by(id=user_id).first()
    limit = get_feed_limit(user)

    query = db.query(UserGrant).filter(UserGrant.user_id == user_id)

    if amount:
        query = query.join(Grant).filter(Grant.amount == amount)
    if deadline:
        query = query.join(Grant).filter(Grant.deadline <= deadline)

    results = query.all()

    feed = {
        "prime_match": [],
        "moderate_fit": [],
        "low_probability": []
    }

    for ug in results:
        feed[ug.fit_category].append({
            "id": str(ug.grant.id),
            "fit_category": ug.fit_category,
            "name": ug.grant.name,
            "amount": ug.grant.amount,
            "deadline": str(ug.grant.deadline),
            "link": ug.grant.link,
            "applied": ug.applied,
            "description": ug.grant.description,
            "details": ug.grant.details,
        })

    # limit feed display for free users
    if limit is not None:
        total = []
        for category in feed:
            total.extend(feed[category])
        limited = total[:limit]
        feed = {
        "prime_match": [],
        "moderate_fit": [],
        "low_probability": []
        }
        for item in limited:
            feed[item["fit_category"]].append(item)

    return {**feed, "is_limited": limit is not None}

@router.post("/refresh")
async def refresh_feed(
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    # Evaluate any agent-discovered grants this user hasn't been scored against yet.
    already_scored = db.query(UserGrant.grant_id).filter(UserGrant.user_id == user_id)
    new_grants = db.query(Grant).filter(
        Grant.source == "agent_discovered",
        ~Grant.id.in_(already_scored)
    ).all()

    if not new_grants:
        return {"evaluated": 0, "message": "No new grants to evaluate"}

    vault_docs = db.query(VaultDocument).filter_by(user_id=user_id).all()
    vault_context = [
        {"name": doc.name, "tag": doc.tag, "gcs_path": doc.gcs_path}
        for doc in vault_docs
    ]

    evaluated_count = 0
    for grant in new_grants:
        prompt = f"""
            Grant details:
            Name: {grant.name}
            Amount: {grant.amount}
            Deadline: {grant.deadline}
            Description: {grant.description}
            Link: {grant.link}
            Eligibility requirements: {(grant.details or {}).get('eligibility_requirements', 'not available')}
            Restrictions: {(grant.details or {}).get('restrictions', 'not available')}
            Required documents: {(grant.details or {}).get('required_documents', 'not available')}

            Organization vault documents available:
            {json.dumps(vault_context)}

            Return JSON with:
            - fit_category: prime_match | moderate_fit | low_probability
            - reason: brief explanation
        """
        try:
            response, _ = await run_agent(prompt, user_id=user_id, agent=evaluation_agent)
            result = extract_json(response)
            fit_category = result.get("fit_category")
            if fit_category not in VALID_FIT_CATEGORIES:
                break
        except Exception:
            fit_category = "low_probability"

        db.add(UserGrant(user_id=user_id, grant_id=grant.id, fit_category=fit_category))
        evaluated_count += 1

    db.commit()
    return {"evaluated": evaluated_count}

@router.post("/submit")
async def submit_grant(
    name: str = Form(...),
    link: Optional[str] = Form(None),
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
    file_bytes = None
    file_mimetype = None
    if file:
        contents = await file.read()
        if len(contents) > 15 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Too large. Maximum file size is 15MB.")
        file_bytes = contents
        file_mimetype = file.content_type
        gcs_path = f"user-vault/{user_id}/grants/{uuid.uuid4()}_{file.filename}"
        upload_file(
            contents=contents,
            destination_path=gcs_path,
            bucket_name=GCS_BUCKET_VAULT,
            content_type=file.content_type
        )
        grant.gcs_path = gcs_path
        db.commit()

    prompt = f"""
        Evaluate this grant for the user:
        Grant name: {name}
        Grant link: {link or 'not provided'}
        {('A supporting document was uploaded for this grant, but its contents are not readable by you '
          '— evaluate on name, link, and vault documents only.') if file_bytes else 'No supporting document was uploaded.'}

        Access the grant link or file document and Check the organization's vault documents and evaluate fit.
        Return JSON with:
        - fit_category: prime_match | moderate_fit | low_probability
        - reason: brief explanation
        - amount: grant amount if found
        - deadline: grant deadline if found
        - description: brief grant description
        - eligibility_requirements: eligibility requirements if found
        - restrictions: restrictions such as word limits if found
        - required_documents: required documents if found
    """

    try:
        response, _ = await run_agent(
            prompt,
            user_id=user_id,
            agent=evaluation_agent,
            file_bytes=file_bytes,
            file_mimetype=file_mimetype,
        )
        result = extract_json(response)

        # update grant with evaluated result details
        grant.amount = result.get("amount")
        grant.description = result.get("description")
        grant.deadline = parse_deadline(result.get("deadline"))
        grant.details = {
            "eligibility_requirements": result.get("eligibility_requirements"),
            "restrictions": result.get("restrictions"),
            "required_documents": result.get("required_documents"),
        }
        fit_category = result.get("fit_category")
        if fit_category not in VALID_FIT_CATEGORIES:
            fit_category = "low_probability"

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
        if fit_category in ["prime_match", "moderate_fit", "low_probability"]:
            application = await start_application(grant, user_id, db)
            user_grant.applied = True
            db.commit()

    except Exception as e:
        # evaluation failed — still surface the grant on the feed instead of
        # silently dropping it (it just won't have a real fit assessment)
        db.add(UserGrant(
            user_id=user_id,
            grant_id=grant.id,
            fit_category="low_probability",
        ))
        db.commit()
        return {
            "grant_id": str(grant.id),
            "status": "saved",
            "warning": f"Agent evaluation failed: {str(e)}"
        }
    return {
        "grant_id": str(grant.id),
        "fit_category": fit_category,
        "status": application.status if application else "low_probability",
        "application_id": str(application.id) if application else None,
        "message": "Grant evaluated and application started" if application else "Grant saved but not qualified for application"
    }

@router.post("/{grant_id}/apply")
async def apply_for_grant(
    grant_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    user = db.query(User).filter_by(id=user_id).first()
    check_can_apply(user)
    check_agent_runs(user)

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

    try:
        application = await start_application(grant, user_id, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent failed: {str(e)}")

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

    feed = {"prime_match": [], "moderate_fit": [], "low_probability": []}
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
