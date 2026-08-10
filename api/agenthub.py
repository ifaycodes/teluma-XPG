from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import AgentRun, ActivityLog
from auth import verify_token

router = APIRouter(prefix="/agents", tags=["agents"])


@router.get("/progress")
def get_agent_progress(
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    # get all active runs
    active_runs = db.query(AgentRun).filter(
        AgentRun.user_id == user_id,
        AgentRun.status.in_(["pending", "running"])
    ).all()

    # get latest activity log entry per active run
    active = []
    for run in active_runs:
        latest_activity = db.query(ActivityLog).filter(
            ActivityLog.agent_run_id == run.id
        ).order_by(ActivityLog.created_at.desc()).first()

        active.append({
            "run_id": str(run.id),
            "status": run.status,
            "triggered_at": str(run.triggered_at),
            "current_step": latest_activity.action if latest_activity else None,
            "step_extradata": latest_activity.extra_data if latest_activity else None
        })

    return {"active": active}


@router.get("/history")
def get_agent_history(
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    completed_runs = db.query(AgentRun).filter(
        AgentRun.user_id == user_id,
        AgentRun.status.in_(["done", "failed"])
    ).order_by(AgentRun.triggered_at.desc()).limit(20).all()

    return [
        {
            "run_id": str(run.id),
            "status": run.status,
            "triggered_at": str(run.triggered_at),
            "completed_at": str(run.completed_at) if run.completed_at else None,
        }
        for run in completed_runs
    ]


import asyncio
import json
from fastapi.responses import StreamingResponse
from database import SessionLocal


@router.get("/{run_id}/steps")
def get_run_steps(
    run_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    # verify run belongs to user
    run = db.query(AgentRun).filter_by(
        id=run_id,
        user_id=user_id
    ).first()

    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    steps = db.query(ActivityLog).filter(
        ActivityLog.agent_run_id == run_id
    ).order_by(ActivityLog.created_at.asc()).all()

    return [
        {
            "action": step.action,
            "actor": step.actor,
            "extra_data": step.extra_data,
            "timestamp": str(step.created_at)
        }
        for step in steps
    ]


@router.get("/stream/{run_id}")
async def stream_agent_telemetry(
    run_id: str,
    user_id: str = Depends(verify_token)
):
    """Server-Sent Events (SSE) streaming endpoint for real-time agent telemetry."""
    async def event_generator():
        last_step_count = 0
        max_attempts = 120  # 2 minute timeout protection

        for _ in range(max_attempts):
            db = SessionLocal()
            try:
                run = db.query(AgentRun).filter_by(id=run_id, user_id=user_id).first()
                steps = db.query(ActivityLog).filter_by(agent_run_id=run_id).order_by(ActivityLog.created_at.asc()).all()

                if len(steps) > last_step_count:
                    new_steps = steps[last_step_count:]
                    last_step_count = len(steps)
                    for step in new_steps:
                        payload = {
                            "action": step.action,
                            "actor": step.actor,
                            "extra_data": step.extra_data,
                            "timestamp": str(step.created_at),
                            "run_status": run.status if run else "running"
                        }
                        yield f"data: {json.dumps(payload)}\n\n"

                if run and run.status in ("done", "failed", "cancelled"):
                    yield f"data: {json.dumps({'event': 'complete', 'status': run.status})}\n\n"
                    break
            finally:
                db.close()

            await asyncio.sleep(1.0)

    return StreamingResponse(event_generator(), media_type="text/event-stream")