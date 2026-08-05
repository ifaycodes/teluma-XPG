import asyncio
import logging
from typing import Coroutine

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
    """Request cancellation of a running job. Returns True if a live task was found."""
    task = _tasks.get(job_id)
    if task and not task.done():
        task.cancel()
        return True
    return False


def is_running(job_id: str) -> bool:
    task = _tasks.get(job_id)
    return task is not None and not task.done()
