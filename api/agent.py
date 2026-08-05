import asyncio

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db, SessionLocal
from models import AgentRun, ActivityLog, Grant
from agents.runner import run_agent
from agents import job_manager
from auth import verify_token
from storage import upload_file, GCS_BUCKET_AGENT
from utils.parsing import extract_json, parse_deadline
from utils.notify import notify
from datetime import datetime, timezone
import json

router = APIRouter(
    prefix="/agent",
    tags=["agent"]
)


async def _run_discovery_job(run_id: str, user_id: str):
    """Background job: discover grants (AG1 via master) and persist them.
    Opens its own DB session since the triggering request has already returned."""
    db = SessionLocal()
    run = db.query(AgentRun).filter_by(id=run_id).first()
    try:
        response, _ = await run_agent(
            prompt="Start scheduled grant discovery.",
            user_id=user_id,
            session_id=run_id
        )

        try:
            grants_data = extract_json(response)
            if not isinstance(grants_data, list):
                grants_data = []
        except (ValueError, TypeError):
            grants_data = []

        # archive the raw discovery output to GCS for audit / future reference
        gcs_path = f"discovery/{run.id}/grants.json"
        upload_file(
            contents=json.dumps(grants_data).encode(),
            destination_path=gcs_path,
            bucket_name=GCS_BUCKET_AGENT,
            content_type="application/json"
        )

        saved_count = 0
        for g in grants_data:
            if not isinstance(g, dict) or not g.get("name"):
                continue

            db.add(Grant(
                name=g.get("name"),
                link=g.get("link"),
                amount=g.get("funding_amount"),
                deadline=parse_deadline(g.get("deadline")),
                description=g.get("description"),
                details={
                    "eligibility_requirements": g.get("eligibility_requirements"),
                    "restrictions": g.get("restrictions"),
                    "required_documents": g.get("required_documents"),
                },
                gcs_path=gcs_path,
                source="agent_discovered",
            ))
            saved_count += 1

        run.status = "done"
        run.completed_at = datetime.now(timezone.utc)
        db.add(ActivityLog(
            user_id=user_id,
            agent_run_id=run.id,
            actor="agent",
            action="discovery_completed",
            extra_data={"grants_found": len(grants_data), "grants_saved": saved_count}
        ))
        db.commit()

        notify(
            db, user_id, "success", "Discovery complete",
            f"Found {saved_count} new grant{'s' if saved_count != 1 else ''} for your feed."
        )

    except asyncio.CancelledError:
        run.status = "cancelled"
        run.completed_at = datetime.now(timezone.utc)
        db.add(ActivityLog(
            user_id=user_id,
            agent_run_id=run.id,
            actor="user",
            action="discovery_cancelled",
        ))
        db.commit()
        raise

    except Exception as err:
        run.status = "failed"
        run.completed_at = datetime.now(timezone.utc)
        db.add(ActivityLog(
            user_id=user_id,
            agent_run_id=run.id,
            actor="agent",
            action="discovery_failed",
            extra_data={"error": str(err)}
        ))
        db.commit()

        notify(db, user_id, "failure", "Discovery failed", "Grant discovery hit an error. Try again from the dashboard.")

    finally:
        db.close()


# manually trigger agent to search for grants (discovery only — evaluation
# happens per-user via POST /feeds/refresh). Runs in the background so it can
# be cancelled instead of blocking the request for the full run.
@router.post("/trigger")
async def trigger_agent(
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    run = AgentRun(user_id=user_id, status="running")
    db.add(run)
    db.commit()
    db.refresh(run)

    db.add(ActivityLog(
        user_id=user_id,
        agent_run_id=run.id,
        actor="agent",
        action="discovery_started",
        extra_data={"run_id": str(run.id)}
    ))
    db.commit()

    job_manager.start_job(str(run.id), _run_discovery_job(str(run.id), user_id))

    return {"run_id": str(run.id), "status": run.status}


@router.post("/{run_id}/cancel")
async def cancel_run(
    run_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    run = db.query(AgentRun).filter_by(id=run_id, user_id=user_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    if run.status not in ("pending", "running"):
        raise HTTPException(status_code=400, detail="Run is not active")

    if not job_manager.cancel_job(run_id):
        raise HTTPException(status_code=400, detail="Run is not currently active on this server")

    return {"run_id": run_id, "status": "cancelling"}
