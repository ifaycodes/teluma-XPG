import logging
import os

from sendbyte import AsyncSendByte, SendByteError

logger = logging.getLogger(__name__)

SENDBYTE_API_KEY = os.getenv("SENDBYTE_API_KEY")
EMAIL_FROM = os.getenv("EMAIL_FROM", "Teluma <hello@teluma.app>")

_client: AsyncSendByte | None = None


def _get_client() -> AsyncSendByte:
    global _client
    if _client is None:
        _client = AsyncSendByte(SENDBYTE_API_KEY)
    return _client


async def send_welcome_email(to_email: str, full_name: str | None) -> None:
    """Best-effort — a failed send should never block signup/login."""
    name = full_name or "there"
    try:
        await _get_client().emails.send(
            from_=EMAIL_FROM,
            to=to_email,
            subject="Welcome to Teluma",
            html=f"""
                <p>Hi {name},</p>
                <p>Welcome to Teluma — your funding and growth OS. We're already scanning for grants that match your organization.</p>
                <p>Head to your Feed to see what's been found so far, or upload documents to your Vault so Teluma can start drafting stronger proposals for you.</p>
                <p>— The Teluma team</p>
            """,
            text=(
                f"Hi {name},\n\n"
                "Welcome to Teluma — your funding and growth OS. We're already scanning for grants that match your organization.\n\n"
                "Head to your Feed to see what's been found so far, or upload documents to your Vault so Teluma can start drafting stronger proposals for you.\n\n"
                "— The Teluma team"
            ),
        )
    except SendByteError as err:
        logger.warning(f"Welcome email failed for {to_email}: {err.code} — {err}")
    except Exception as err:
        logger.warning(f"Welcome email failed for {to_email}: {err}")
