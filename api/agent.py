from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import AgentRun, ActivityLog
from agents.runner import run_agent
from auth import verify_token
from datetime import datetime, timezone

router = APIRouter(
    prefix="/agent",
    tags=["agent"]
)

# manually trigger agent to search for grants
@router.post("/trigger")
async def trigger_agent(
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    run = AgentRun(user_id=user_id, status="pending")
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

    # run agent
    run.status = "running"
    db.commit()

    try:
        response, sid = await run_agent(
            prompt="Start grant discovery. Search for active grants and evaluate them",
            user_id=user_id,
            session_id=str(run.id)
        )
        run.status = "done"
        run.completed_at = datetime.now(timezone.utc)

        db.add(ActivityLog(
            user_id=user_id,
            agent_run_id=run.id,
            actor="agent",
            action="discovery_completed",
            extra_data={"response": response[:500]}
        ))

    except Exception as err:
        run.status = "failed"
        db.add(ActivityLog(
            user_id=user_id,
            agent_run_id=run.id,
            actor="agent",
            action="discovery_failed",
            extra_data={"error": str(err)}
        ))

    db.commit()
    return {"run_id": str(run.id), "status": run.status}