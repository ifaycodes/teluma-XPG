from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from agents.runner import run_agent, log_agent_step
from agents import job_manager
from agents.application_flow import start_proposal_generation, save_draft
from agents.ag3_outline import outline_agent
from agents.ag4_proposal import proposal_agent
from database import get_db
from models import ApplicationTracker, ApplicationChat, ActivityLog, VaultDocument, User
from auth import verify_token
from datetime import datetime, timezone
from utils.notify import notify

from storage import get_signed_url, download_text, GCS_BUCKET_AGENT

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
            "grant_id": str(app.grant_id),
            "grant_name": app.grant.name,
            "grant_amount": app.grant.amount,
            "grant_deadline": str(app.grant.deadline),
            "grant_link": app.grant.link,
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

    start_proposal_generation(application, user_id)

    return {
        "application_id": str(application.id),
        "status": application.status,
    }

@router.post("/{application_id}/cancel")
async def cancel_application_job(
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

    if application.status not in ("outline_in_progress", "proposal_in_progress"):
        raise HTTPException(status_code=400, detail="Application has no active agent job to cancel")

    if not job_manager.cancel_job(application_id):
        raise HTTPException(status_code=400, detail="Job is not currently active on this server")

    return {"application_id": application_id, "status": "cancelling"}

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

    # Auto-upload approved proposal PDF strictly upon approval
    if application.proposal_gcs_path:
        pdf_path = application.proposal_gcs_path.rsplit(".", 1)[0] + ".pdf"
        existing_doc = db.query(VaultDocument).filter_by(
            user_id=user_id,
            gcs_path=pdf_path
        ).first()
        if not existing_doc:
            doc_name = f"Approved Proposal — {application.grant.name}.pdf"
            vault_doc = VaultDocument(
                user_id=user_id,
                name=doc_name,
                tag="proposal",
                gcs_path=pdf_path,
                file_type="application/pdf",
                file_size_bytes=500000
            )
            db.add(vault_doc)
            user = db.query(User).filter_by(id=user_id).first()
            if user:
                user.storage_used_bytes += 500000
            notify(db, user_id, "success", "Proposal Saved to Vault", f"Your approved proposal for {application.grant.name} is now stored in your Vault.")

    db.commit()

    return {
        "application_id": str(application.id),
        "status": application.status,
        "message": "Proposal approved and saved to Vault. Ready for submission."
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

    return {
        "status": "submitted",
        "submitted_at": str(application.submitted_at),
        "grant_link": application.grant.link,
        "message": "Application marked as submitted. Please check the official grant link to verify submission requirements."
    }

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
        "outline_gcs_path": app.outline_gcs_path,
        "proposal_gcs_path": app.proposal_gcs_path,
        "budget_gcs_path": app.budget_gcs_path,
        "agent_run_id": str(app.agent_run_id) if app.agent_run_id else None,
        "started_at": str(app.started_at),
        "submitted_at": str(app.submitted_at) if app.submitted_at else None
    }


@router.get("/{application_id}/content")
def get_application_content(
    application_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    """Return the agent-drafted text for whichever stage this application is
    currently at, so the user can actually read what was produced."""
    application = db.query(ApplicationTracker).filter_by(
        id=application_id,
        user_id=user_id
    ).first()

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    if application.status in ("proposal_review", "pending", "submitted", "proposal_in_progress") and application.proposal_gcs_path:
        gcs_path, kind = application.proposal_gcs_path, "proposal"
    elif application.outline_gcs_path:
        gcs_path, kind = application.outline_gcs_path, "outline"
    else:
        return {"kind": None, "content": None}

    try:
        content = download_text(gcs_path=gcs_path, bucket_name=GCS_BUCKET_AGENT)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to read draft from storage: {str(e)}")

    return {"kind": kind, "content": content}

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

    # which draft is actually open for editing is determined by the
    # application's current stage, not by asking an agent to guess intent
    if application.status == "outline_review":
        stage, agent, gcs_path = "outline", outline_agent, application.outline_gcs_path
        title = f"Proposal Outline — {application.grant.name}"
    elif application.status == "proposal_review":
        stage, agent, gcs_path = "proposal", proposal_agent, application.proposal_gcs_path
        title = f"Grant Proposal — {application.grant.name}"
    else:
        reply = "There's no draft currently open for edits at this stage."
        db.add(ApplicationChat(application_id=application_id, user_id=user_id, role="agent", message=reply))
        db.commit()
        return {"response": reply}

    try:
        current_draft = download_text(gcs_path=gcs_path, bucket_name=GCS_BUCKET_AGENT) if gcs_path else ""
    except Exception:
        current_draft = ""

    prompt = f"""
        Here is the current {stage} for this grant application:
        {current_draft}

        The user has requested this change:
        {body.message}

        Revise the {stage} accordingly and return the complete, updated
        version in the same JSON shape as before.
    """

    log_agent_step(user_id, application_id, f"Revising the {stage} based on your request...")

    # call the sub-agent directly (not master_agent) so its raw JSON output
    # stays internal — it's meant for storage, never for display to the user
    response, _ = await run_agent(
        prompt=prompt,
        user_id=user_id,
        session_id=str(application.id),
        agent=agent
    )

    log_agent_step(user_id, application_id, f"Revised {stage} complete")

    save_draft(response, gcs_path, stage, title)

    reply = f"I've updated the {stage} based on your request — you can review the changes above."
    db.add(ApplicationChat(application_id=application_id, user_id=user_id, role="agent", message=reply))
    db.commit()

    return {"response": reply}

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

@router.get("/{application_id}/activity")
def get_application_activity(
    application_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    """Agent telemetry (tool calls, handoffs) for this application, keyed the
    same way discovery runs are — application_id doubles as agent_run_id
    since outline/proposal generation route through master_agent too."""
    application = db.query(ApplicationTracker).filter_by(
        id=application_id,
        user_id=user_id
    ).first()

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    steps = db.query(ActivityLog).filter_by(
        agent_run_id=application_id
    ).order_by(ActivityLog.created_at.asc()).all()

    return [
        {
            "actor": step.actor,
            "action": step.action,
            "extra_data": step.extra_data,
            "timestamp": str(step.created_at),
        }
        for step in steps
    ]


@router.get("/{application_id}/download")
def download_output(
    application_id: str,
    kind: str = "proposal",
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    application = db.query(ApplicationTracker).filter_by(
        id=application_id,
        user_id=user_id
    ).first()

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    if kind == "outline":
        if application.status in ("outline_in_progress", "outline_review"):
            raise HTTPException(status_code=400, detail="Outline is not approved yet")
        gcs_path = application.outline_gcs_path

    elif kind in ("proposal", "budget"):
        if application.status not in ("pending", "submitted"):
            raise HTTPException(status_code=400, detail=f"{kind.capitalize()} is not approved yet")
        gcs_path = application.proposal_gcs_path if kind == "proposal" else application.budget_gcs_path

    else:
        raise HTTPException(status_code=400, detail="Invalid kind")

    if not gcs_path:
        raise HTTPException(status_code=404, detail=f"No {kind} available")

    # generation always saves a rendered PDF alongside the raw JSON at the
    # same path with a .pdf extension — sign that instead of the raw blob
    pdf_path = gcs_path.rsplit(".", 1)[0] + ".pdf"
    url = get_signed_url(
        gcs_path=pdf_path,
        bucket_name=GCS_BUCKET_AGENT,
        expiration_minutes=30
    )
    return {"download_url": url, "kind": kind}