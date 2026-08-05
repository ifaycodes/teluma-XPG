import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import Base, engine
from api import agent, user, feeds, vault, agenthub, hub, billing, notifications
from scheduler import scheduler, start_scheduler, reset_monthly_agent_runs
from apscheduler.triggers.cron import CronTrigger

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    start_scheduler()

    yield

    scheduler.shutdown()

app = FastAPI(lifespan=lifespan)

# comma-separated list of allowed frontend origins, e.g. "http://localhost:3000,https://app.teluma.com"
_frontend_origins = os.getenv("FRONTEND_ORIGINS", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in _frontend_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

scheduler.add_job(
    reset_monthly_agent_runs,
    CronTrigger(day=1, hour=0),  # first of every month
    id="reset_agent_runs",
    replace_existing=True
)

# register routes
app.include_router(user.router)
app.include_router(user.profile_router)
app.include_router(feeds.router)
app.include_router(vault.router)
app.include_router(hub.router)
app.include_router(agenthub.router)
app.include_router(agent.router)
app.include_router(billing.router)
app.include_router(notifications.router)

@app.get("/")
def root():
    return {"status": "ok"}

@app.get("/health")
def health():
    return {"status": "healthy"}