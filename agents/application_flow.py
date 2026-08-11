import asyncio
import json

from sqlalchemy.orm import Session

from agents.runner import run_agent, log_agent_step
from agents import job_manager
from database import SessionLocal
from models import ApplicationTracker, VaultDocument, User
from storage import upload_file, GCS_BUCKET_AGENT
from utils.parsing import extract_json
from utils.pdf_generator import render_document_pdf
from utils.notify import notify

from utils.rag_engine import retrieve_relevant_vault_context


def parse_draft(response: str, fallback_key: str) -> dict:
    try:
        parsed = extract_json(response)
    except (ValueError, TypeError):
        parsed = None
    if not isinstance(parsed, dict):
        parsed = {fallback_key: parsed if parsed is not None else response}
    return parsed


def save_draft(response: str, gcs_path: str, fallback_key: str, title: str) -> None:
    """Persist both the raw JSON (used to re-hydrate the Agent Draft panel)
    and a rendered PDF (used for the actual downloadable file)."""
    upload_file(
        contents=response.encode(),
        destination_path=gcs_path,
        bucket_name=GCS_BUCKET_AGENT,
        content_type="application/json"
    )

    parsed = parse_draft(response, fallback_key)
    pdf_bytes = render_document_pdf(parsed, title)
    upload_file(
        contents=pdf_bytes,
        destination_path=gcs_path.rsplit(".", 1)[0] + ".pdf",
        bucket_name=GCS_BUCKET_AGENT,
        content_type="application/pdf"
    )


def _build_vault_context(user_id: str, grant_query: str, db: Session):
    return retrieve_relevant_vault_context(user_id=user_id, grant_query=grant_query, db=db, top_k=5)


async def _generate_outline_job(application_id: str, user_id: str):
    """Background job: AG3 drafts a proposal outline for this application."""
    db = SessionLocal()
    application = db.query(ApplicationTracker).filter_by(id=application_id).first()
    try:
        if application.cancel_requested:
            application.status = "cancelled"
            db.commit()
            return

        grant_query = f"{application.grant.name} {application.grant.description or ''}"
        vault_context = _build_vault_context(user_id, grant_query, db)
        prompt = f"""
            Start application flow for this grant:
            Grant: {application.grant.name}
            Amount: {application.grant.amount}
            Deadline: {application.grant.deadline}
            Description: {application.grant.description}
            Link: {application.grant.link}

            Most relevant organization vault document passages:
            {json.dumps(vault_context)}

            Generate a proposal outline.
        """

        log_agent_step(user_id, application_id, f"Drafting a proposal outline for {application.grant.name}...")

        response, _ = await run_agent(
            prompt=prompt,
            user_id=user_id,
            session_id=application_id
        )

        db.refresh(application)
        if application.cancel_requested:
            application.status = "cancelled"
            db.commit()
            return

        log_agent_step(user_id, application_id, "Outline draft complete — writing it to storage")

        outline_path = f"applications/{user_id}/{application_id}/outline.json"
        save_draft(response, outline_path, "outline", f"Proposal Outline — {application.grant.name}")

        application.outline_gcs_path = outline_path
        application.status = "outline_review"
        db.commit()

        notify(db, user_id, "success", "Outline ready", f"Your proposal outline for {application.grant.name} is ready to review.")

    except asyncio.CancelledError:
        application.status = "cancelled"
        db.commit()
        raise

    except Exception:
        application.status = "failed"
        db.commit()
        notify(db, user_id, "failure", "Outline generation failed", f"Something went wrong drafting the outline for {application.grant.name}.")

    finally:
        db.close()


async def _generate_proposal_job(application_id: str, user_id: str):
    """Background job: AG4 writes the full proposal + budget for this application."""
    db = SessionLocal()
    application = db.query(ApplicationTracker).filter_by(id=application_id).first()
    try:
        if application.cancel_requested:
            application.status = "cancelled"
            db.commit()
            return

        grant_query = f"{application.grant.name} {application.grant.description or ''}"
        vault_context = _build_vault_context(user_id, grant_query, db)
        prompt = f"""
            The user has approved the proposal outline.
            Outline is stored at: {application.outline_gcs_path}

            Now write the full grant proposal and budget.
            Grant: {application.grant.name}
            Most relevant organization vault document passages: {json.dumps(vault_context)}

            Return proposal text and itemized budget.
        """

        log_agent_step(user_id, application_id, f"Writing the full proposal and budget for {application.grant.name}...")

        response, _ = await run_agent(
            prompt=prompt,
            user_id=user_id,
            session_id=application_id
        )

        db.refresh(application)
        if application.cancel_requested:
            application.status = "cancelled"
            db.commit()
            return

        log_agent_step(user_id, application_id, "Proposal draft complete — writing it to storage")

        proposal_path = f"applications/{user_id}/{application_id}/proposal.json"
        save_draft(response, proposal_path, "proposal", f"Grant Proposal — {application.grant.name}")

        application.proposal_gcs_path = proposal_path
        application.budget_gcs_path = proposal_path  # budget is embedded in the same document
        application.status = "proposal_review"
        db.commit()

        notify(db, user_id, "success", "Proposal ready", f"Your full proposal and budget for {application.grant.name} is ready to review.")

    except asyncio.CancelledError:
        application.status = "cancelled"
        db.commit()
        raise

    except Exception:
        application.status = "failed"
        db.commit()
        notify(db, user_id, "failure", "Proposal generation failed", f"Something went wrong drafting the proposal for {application.grant.name}.")

    finally:
        db.close()


def start_proposal_generation(application: ApplicationTracker, user_id: str) -> None:
    """Kick off AG4 as a cancellable background job. Caller is responsible for
    setting application.status = "proposal_in_progress" and committing first."""
    job_manager.start_job(str(application.id), _generate_proposal_job(str(application.id), user_id))


async def start_application(grant, user_id: str, db: Session) -> ApplicationTracker:
    """Create (or reuse) an application for this grant and kick off outline
    generation as a cancellable background job.

    Shared by feeds.py and hub.py so both "Apply" entry points behave
    identically and don't drift into inconsistent duplicate implementations.
    """
    existing = db.query(ApplicationTracker).filter(
        ApplicationTracker.user_id == user_id,
        ApplicationTracker.grant_id == grant.id,
        ApplicationTracker.status.notin_(["failed", "cancelled"])
    ).first()
    if existing:
        return existing

    application = ApplicationTracker(
        user_id=user_id,
        grant_id=grant.id,
        status="outline_in_progress"
    )
    db.add(application)

    db.query(User).filter_by(id=user_id).update({
        User.drafts_this_month: User.drafts_this_month + 1
    })

    db.commit()
    db.refresh(application)

    job_manager.start_job(str(application.id), _generate_outline_job(str(application.id), user_id))

    return application
