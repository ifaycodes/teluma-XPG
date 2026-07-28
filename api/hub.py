import json

from fastapi import APIRouter, Depends, HTTPException
from google.adk.cli.utils.common import BaseModel
from sqlalchemy.orm import Session

from agents.runner import run_agent
from database import get_db
from models import ApplicationTracker, Grant, VaultDocument, ApplicationChat
from auth import verify_token
from datetime import datetime, timezone

from storage import get_signed_url, GCS_BUCKET_AGENT, upload_file

router = APIRouter(
    prefix="/hub",
    tags=["hub"]
)

class ChatMessage(BaseModel):
    message: str

@router.get("/")
def get_applications(
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token),
):
    applications = db.query(ApplicationTracker).filter(
        ApplicationTracker.user_id == user_id
    ).all()

    return [
        {
            "id": str(app.id),
            "grant_name": app.grant.name,
            "grant_amount": app.grant.amount,
            "grant_deadline": str(app.grant.deadline),
            "status": app.status,
            "outline_gcs_path": app.outline_gcs_path,
            "proposal_gcs_path": app.proposal_gcs_path,
            "budget_gcs_path": app.budget_gcs_path,
            "started_at": str(app.started_at),
            "submitted_at": str(app.submitted_at) if app.submitted_at else None
        }
        for app in applications
    ]

@router.post("/{application_id}/approve-outline")
async def approve_outline(
    application_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    application = db.query(ApplicationTracker).filter_by(
        id=application_id,
        user_id=user_id
    ).first()

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    if application.status != "outline_review":
        raise HTTPException(status_code=400, detail="Application is not awaiting outline approval")

    application.status = "proposal_in_progress"
    db.commit()

    # pull outline from GCS and trigger AG4
    vault_docs = db.query(VaultDocument).filter_by(user_id=user_id).all()
    vault_context = [
        {"name": doc.name, "tag": doc.tag, "gcs_path": doc.gcs_path}
        for doc in vault_docs
    ]

    prompt = f"""
            The user has approved the proposal outline.
            Outline is stored at: {application.outline_gcs_path}

            Now write the full grant proposal and budget.
            Grant: {application.grant.name}
            Organization vault documents: {json.dumps(vault_context)}

            Return proposal text and itemized budget.
        """

    try:
        response, _ = await run_agent(
            prompt=prompt,
            user_id=user_id,
            session_id=str(application.id)
        )

        # save proposal to GCS
        proposal_path = f"applications/{user_id}/{application.id}/proposal.json"
        upload_file(
            contents=response.encode(),
            destination_path=proposal_path,
            bucket_name=GCS_BUCKET_AGENT,
            content_type="application/json"
        )

        application.proposal_gcs_path = proposal_path
        application.status = "proposal_review"

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent failed: {str(e)}")

    db.commit()
    return {
        "application_id": str(application.id),
        "status": application.status,
        "proposal_gcs_path": application.proposal_gcs_path
    }

@router.post("/{application_id}/approve-proposal")
def approve_proposal(
    application_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    application = db.query(ApplicationTracker).filter_by(
        id=application_id,
        user_id=user_id
    ).first()

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    if application.status != "proposal_review":
        raise HTTPException(status_code=400, detail="Application is not awaiting proposal approval")

    # mark ready — user will submit manually
    application.status = "pending"
    db.commit()

    return {
        "application_id": str(application.id),
        "status": application.status,
        "message": "Proposal approved. Ready for submission."
    }

@router.post("/{application_id}/submit")
def submit_application(
    application_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    application = db.query(ApplicationTracker).filter_by(
        id=application_id,
        user_id=user_id
    ).first()

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    if application.status != "pending":
        raise HTTPException(status_code=400, detail="Application is not ready for submission")

    application.status = "submitted"
    application.submitted_at = datetime.now(timezone.utc)
    db.commit()

    return {"status": "submitted", "submitted_at": str(application.submitted_at)}

@router.get("/{application_id}")
def get_application(
    application_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    app = db.query(ApplicationTracker).filter_by(
        id = application_id,
        user_id = user_id
    ).first()

    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    return {
        "id": str(app.id),
        "grant_name": app.grant.name,
        "grant_amount": app.grant.amount,
        "status": app.status,
        "output_gcs_path": app.output_gcs_path,
        "agent_run_id": str(app.agent_run_id) if app.agent_run_id else None,
        "started_at": str(app.started_at),
        "submitted_at": str(app.submitted_at) if app.submitted_at else None
    }


@router.post("/{application_id}/chat")
async def chat_with_agent(
    application_id: str,
    body: ChatMessage,
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    application = db.query(ApplicationTracker).filter_by(
        id=application_id,
        user_id=user_id
    ).first()

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    # save user message
    db.add(ApplicationChat(
        application_id=application_id,
        user_id=user_id,
        role="user",
        message=body.message
    ))
    db.commit()

    prompt = f"""
        You are helping with an active grant application.
        Application ID: {application_id}
        Grant: {application.grant.name}
        Current status: {application.status}
        Outline: {application.outline_gcs_path}
        Proposal: {application.proposal_gcs_path}

        User message: {body.message}

        Understand what the user wants changed and call the appropriate agent.
        If they want outline changes, call proposal_outline_agent.
        If they want proposal or budget changes, call proposal_writing_agent.
    """

    response, _ = await run_agent(
        prompt=prompt,
        user_id=user_id,
        session_id=str(application.id)
    )

    # save agent response
    db.add(ApplicationChat(
        application_id=application_id,
        user_id=user_id,
        role="agent",
        message=response
    ))
    db.commit()

    return {"response": response}

@router.get("/{application_id}/chat")
def get_chat_history(
    application_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    application = db.query(ApplicationTracker).filter_by(
        id=application_id,
        user_id=user_id
    ).first()

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    chats = db.query(ApplicationChat).filter_by(
        application_id=application_id
    ).order_by(ApplicationChat.created_at.asc()).all()

    return [
        {
            "role": chat.role,
            "message": chat.message,
            "created_at": str(chat.created_at)
        }
        for chat in chats
    ]

@router.get("/{application_id}/download")
def download_output(
    application_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    application = db.query(ApplicationTracker).filter_by(
        id=application_id,
        user_id=user_id
    ).first()

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    if not application.proposal_gcs_path:
        raise HTTPException(status_code=404, detail="No proposal available yet")

    url = get_signed_url(
        gcs_path=application.proposal_gcs_path,
        bucket_name=GCS_BUCKET_AGENT,
        expiration_minutes=30
    )
    return {"download_url": url}