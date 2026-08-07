from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from agents.runner import run_agent
from database import SessionLocal
from models import User, AgentRun, ActivityLog, Grant, UserGrant
from storage import upload_file, GCS_BUCKET_AGENT
from utils.parsing import extract_json, parse_deadline
from datetime import datetime, timezone
import json
import logging

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()

async def run_discovery():
    db = SessionLocal()
    run = None
    try:
        # clean out expired grants
        now = datetime.now(timezone.utc)
        expired = db.query(Grant).filter(Grant.deadline < now).all()
        for grant in expired:
            db.query(UserGrant).filter(UserGrant.grant_id == grant.id).delete()
            db.delete(grant)
        db.commit()
        logger.info(f"Cleaned up {len(expired)} expired Grants")

        # create a system-level run log
        run = AgentRun(
            user_id=None,
            status="running"
        )
        db.add(run)
        db.commit()
        db.refresh(run)

        db.add(ActivityLog(
            user_id=None,
            agent_run_id=run.id,
            actor="agent",
            action="scheduled_discovery_started",
            extra_data={"triggered_at": str(now)}
        ))
        db.commit()

        response, _ = await run_agent(
            prompt="Start scheduled grant discovery.",
            user_id="system",
            session_id=str(run.id)
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
            user_id=None,
            agent_run_id=run.id,
            actor="agent",
            action="scheduled_discovery_completed",
            extra_data={"grants_found": len(grants_data), "grants_saved": saved_count, "gcs_path": gcs_path}
        ))
    except Exception as err:
        logger.error(f"Scheduled discovery failed: {err}")
        if run:
            run.status = "failed"
            db.add(ActivityLog(
                user_id=None,
                agent_run_id=run.id,
                actor="agent",
                action="scheduled_discovery_failed",
                extra_data={"error": str(err)}
            ))

    finally:
        db.commit()
        db.close()

def start_scheduler():
    scheduler.add_job(
        run_discovery,
        CronTrigger(hour="0,6,12,18"),
        id="scheduled_grant_discovery",
        replace_existing=True
    )

    scheduler.add_job(
        run_discovery,
        CronTrigger(day_of_week="sun", hour=0),
        id="grant_cleanup",
        replace_existing=True
    )

    scheduler.start()
    logger.info(f"Scheduler started")


async def reset_monthly_agent_runs():
    db = SessionLocal()
    try:
        db.query(User).update({"drafts_this_month": 0})
        db.commit()
    finally:
        db.close()