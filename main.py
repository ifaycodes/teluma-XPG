from fastapi import FastAPI
from contextlib import asynccontextmanager
from database import Base, engine
from api import agent, user, feeds, vault, agenthub, hub
from scheduler import scheduler, start_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    start_scheduler()

    yield

    scheduler.shutdown()

app = FastAPI(lifespan=lifespan)

# register routes
app.include_router(user.router)
app.include_router(feeds.router)
app.include_router(vault.router)
app.include_router(hub.router)
app.include_router(agenthub.router)
app.include_router(agent.router)

@app.get("/")
def root():
    return {"status": "ok"}

@app.get("/health")
def health():
    return {"status": "healthy"}