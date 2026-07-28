from http.client import responses

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from agents.runner import run_agent
from database import SessionLocal
from models import AgentRun, ActivityLog, Grant,UserGrant
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()

async def run_discovery():
    db = SessionLocal()
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
            prompt="Start scheduled grant discovery. Search for active grants, evaluate them against all user profiles in the system.",
            user_id="system",
            session_id=str(run.id)
        )

        run.status = "done"
        run.completed_at = datetime.now(timezone.utc)
        db.add(ActivityLog(
            user_id=None,
            agent_run_id=run.id,
            actor="agent",
            action="scheduled_discovery_completed",
            extra_data={"response": response[:500]}
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
