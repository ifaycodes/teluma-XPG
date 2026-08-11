import asyncio
import logging
from typing import Coroutine
from database import SessionLocal
from models import AgentRun, ApplicationTracker
import uuid

logger = logging.getLogger(__name__)

# In-memory only — lost on restart, not shared across worker processes.
# Fine for a single-process dev backend; see project notes before scaling out.
_tasks: dict[str, asyncio.Task] = {}


def start_job(job_id: str, coro: Coroutine) -> asyncio.Task:
    """Schedule a coroutine as a trackable, cancellable background task."""
    task = asyncio.create_task(coro)
    _tasks[job_id] = task

    def _cleanup(t: asyncio.Task):
        _tasks.pop(job_id, None)
        if t.cancelled():
            logger.info(f"Job {job_id} was cancelled")
        elif t.exception():
            logger.error(f"Job {job_id} failed: {t.exception()}")

    task.add_done_callback(_cleanup)
    return task


def cancel_job(job_id: str) -> bool:
    """Request cancellation of a running job. Cancels local task if present and sets DB flags."""
    task = _tasks.get(job_id)
    cancelled_local = False
    if task and not task.done():
        task.cancel()
        cancelled_local = True

    # Persist cancellation flag in DB for cross-worker & process safety
    db = SessionLocal()
    db_updated = False
    try:
        try:
            uid = uuid.UUID(job_id)
        except (ValueError, TypeError):
            uid = None

        if uid:
            run = db.query(AgentRun).filter_by(id=uid).first()
            if run and run.status in ("pending", "running"):
                run.cancel_requested = True
                run.status = "cancelled"
                db_updated = True

            app = db.query(ApplicationTracker).filter_by(id=uid).first()
            if app and app.status in ("outline_in_progress", "proposal_in_progress"):
                app.cancel_requested = True
                app.status = "cancelled"
                db_updated = True

            db.commit()
    except Exception as e:
        logger.error(f"Failed to set DB cancellation flag for {job_id}: {e}")
    finally:
        db.close()

    return cancelled_local or db_updated


def is_running(job_id: str) -> bool:
    task = _tasks.get(job_id)
    if task is not None and not task.done():
        return True

    db = SessionLocal()
    try:
        try:
            uid = uuid.UUID(job_id)
        except (ValueError, TypeError):
            return False

        run = db.query(AgentRun).filter_by(id=uid).first()
        if run and run.status in ("pending", "running") and not run.cancel_requested:
            return True

        app = db.query(ApplicationTracker).filter_by(id=uid).first()
        if app and app.status in ("outline_in_progress", "proposal_in_progress") and not app.cancel_requested:
            return True
    finally:
        db.close()

    return False
