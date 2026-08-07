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


async def _send(to_email: str, subject: str, html: str, text: str, label: str) -> None:
    """Best-effort — a failed send should never block the caller's flow."""
    try:
        await _get_client().send_email(
            from_=EMAIL_FROM,
            to=to_email,
            subject=subject,
            html=html,
            text=text,
        )
    except SendByteError as err:
        logger.warning(f"{label} email failed for {to_email}: {err.code} — {err}")
    except Exception as err:
        logger.warning(f"{label} email failed for {to_email}: {err}")


async def send_welcome_email(to_email: str, full_name: str | None) -> None:
    name = full_name or "there"
    await _send(
        to_email,
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
        label="Welcome",
    )


async def send_payment_success_email(to_email: str, full_name: str | None, plan: str) -> None:
    name = full_name or "there"
    await _send(
        to_email,
        subject="Your Teluma subscription is active",
        html=f"""
            <p>Hi {name},</p>
            <p>Your payment went through and you're now on the <strong>{plan.capitalize()}</strong> plan.</p>
            <p>You can manage your subscription, payment method, and invoices anytime from Settings in Teluma.</p>
            <p>— The Teluma team</p>
        """,
        text=(
            f"Hi {name},\n\n"
            f"Your payment went through and you're now on the {plan.capitalize()} plan.\n\n"
            "You can manage your subscription, payment method, and invoices anytime from Settings in Teluma.\n\n"
            "— The Teluma team"
        ),
        label="Payment success",
    )


async def send_payment_failed_email(to_email: str, full_name: str | None, reason: str | None) -> None:
    name = full_name or "there"
    reason_line = reason or "Your payment method may have insufficient funds or need updating."
    await _send(
        to_email,
        subject="We couldn't process your Teluma payment",
        html=f"""
            <p>Hi {name},</p>
            <p>We weren't able to process your last payment. {reason_line}</p>
            <p>Update your payment method from Settings in Teluma to keep your plan active.</p>
            <p>— The Teluma team</p>
        """,
        text=(
            f"Hi {name},\n\n"
            f"We weren't able to process your last payment. {reason_line}\n\n"
            "Update your payment method from Settings in Teluma to keep your plan active.\n\n"
            "— The Teluma team"
        ),
        label="Payment failed",
    )
