from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.agents import Agent
from google.genai.types import Content, Part
from agents.master import master_agent
from database import SessionLocal
from models import ActivityLog
import uuid

session_service = InMemorySessionService()
APP_NAME = "grant_master"


def log_agent_step(user_id: str, run_id: str, action: str, extra_data: dict = None):
    """Best-effort telemetry for the Agents page's live log — never let a
    logging failure interrupt the actual agent run."""
    try:
        valid_user_id = str(uuid.UUID(user_id))
    except (ValueError, TypeError, AttributeError):
        valid_user_id = None

    db = SessionLocal()
    try:
        db.add(ActivityLog(
            user_id=valid_user_id,
            agent_run_id=run_id,
            actor="agent",
            action=action,
            extra_data=extra_data,
        ))
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


async def run_agent(
        prompt: str,
        user_id: str,
        session_id: str = None,
        run_id: str = None,
        agent: Agent = None,
        file_bytes: bytes = None,
        file_mimetype: str = None,
) -> str:
    sid = session_id or str(uuid.uuid4())
    # run_id groups telemetry for the Agents page — separate from sid (the ADK
    # conversation session) so callers like refresh_feed can give each grant
    # its own independent conversation while still logging under one shared,
    # discoverable run (defaults to sid when the caller doesn't need that split)
    rid = run_id or sid
    agent = agent or master_agent

    session = await session_service.get_session(
        app_name=APP_NAME,
        user_id=user_id,
        session_id=sid
    )
    if session is None:
        session = await session_service.create_session(
            app_name=APP_NAME,
            user_id=user_id,
            session_id=sid
        )

    runner = Runner(
        agent=agent,
        app_name=APP_NAME,
        session_service=session_service
    )

    parts = [Part(text=prompt)]
    if file_bytes is not None:
        parts.append(Part.from_bytes(data=file_bytes, mime_type=file_mimetype or "application/octet-stream"))

    message = Content(role="user", parts=parts)

    response_text = ""
    async for event in runner.run_async(
        user_id=user_id,
        session_id=sid,
        new_message=message
    ):
        if event.partial:
            continue

        if event.actions and event.actions.transfer_to_agent:
            log_agent_step(user_id, rid, f"{event.author} handed off to {event.actions.transfer_to_agent}")

        if event.content and event.content.parts:
            for part in event.content.parts:
                if part.function_call:
                    log_agent_step(
                        user_id, rid,
                        f"{event.author} called {part.function_call.name}",
                        {"args": part.function_call.args},
                    )
                elif part.function_response:
                    preview = str(part.function_response.response)
                    if len(preview) > 500:
                        preview = preview[:500] + "..."
                    log_agent_step(
                        user_id, rid,
                        f"{part.function_response.name} returned a result",
                        {"preview": preview},
                    )

        if event.is_final_response() and event.content:
            for part in event.content.parts:
                if part.text:
                    response_text += part.text

    return response_text, sid