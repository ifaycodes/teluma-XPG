from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.agents import Agent
from google.genai.types import Content, Part
from agents.master import master_agent
import uuid

session_service = InMemorySessionService()
APP_NAME = "grant_master"


async def run_agent(
        prompt: str,
        user_id: str,
        session_id: str = None,
        agent: Agent = None,
        file_bytes: bytes = None,
        file_mimetype: str = None,
) -> str:
    sid = session_id or str(uuid.uuid4())
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
        parts.append(Part.from_bytes(data=file_bytes, mimetype=file_mimetype or "application/octet-stream"))

    message = Content(role="user", parts=parts)

    response_text = ""
    async for event in runner.run_async(
        user_id=user_id,
        session_id=sid,
        new_message=message
    ):
        if event.is_final_response() and event.content:
            for part in event.content.parts:
                if part.text:
                    response_text += part.text

    return response_text, sid