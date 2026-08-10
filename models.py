from sqlalchemy import Column, String, DateTime, Text, Enum, ForeignKey, Boolean, BigInteger, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime, timezone

from sqlalchemy.orm import relationship

from database import Base
import uuid

def utcnow():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"  # not table_name
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True)
    full_name = Column(String)
    email = Column(String)
    organization_type = Column(Enum("Non-profit/NGO", "SME", "Early-stage Startup", "Academic Institution", "Independent Specialist", "Other", name="org_type"), nullable=True)
    area_of_focus = Column(String)
    storage_used_bytes = Column(BigInteger, default=0)
    storage_limit_bytes = Column(BigInteger, default=524288000)
    # plan tiers map to the pricing page as: basic=Starter, pro=Pro, enterprise=Agency/Consultant
    plan = Column(Enum("free", "basic", "pro", "enterprise", name="user_plan"), default="free")
    plan_selected = Column(Boolean, default=False)  # gates the dashboard until they pick free-trial or a paid plan
    subscription_status = Column(String, nullable=True)  # trialing, active, past_due, unpaid, canceled, paused
    bachs_customer_id = Column(String, nullable=True)
    bachs_subscription_id = Column(String, nullable=True)
    drafts_this_month = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=utcnow)

class AgentRun(Base):
    __tablename__ = "agent_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("public.users.id"), nullable=True)
    status = Column(Enum("pending", "running", "done", "failed", "cancelled", name="run_status"), default="pending")
    cancel_requested = Column(Boolean, default=False)
    triggered_at = Column(DateTime(timezone=True), default=utcnow)
    completed_at = Column(DateTime(timezone=True), nullable=True)

class ActivityLog(Base):
    __tablename__ = "activity_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("public.users.id"), nullable=True)
    agent_run_id = Column(UUID(as_uuid=True), nullable=True)
    actor = Column(Enum("user", "agent", name="actor_type"), nullable=False)
    action = Column(String, nullable=False)
    extra_data = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

class Grant(Base):
    __tablename__ = 'grants'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    link = Column(String, nullable=True)
    amount = Column(String, nullable=True)
    deadline = Column(DateTime(timezone=True), nullable=True)
    description = Column(Text, nullable=True)
    details = Column(JSONB, nullable=True)  # eligibility_requirements, restrictions, required_documents from AG1
    gcs_path = Column(String, nullable=True)
    source = Column(
        Enum("agent_discovered", "user_submitted", name="grant_source"),
        nullable=False
    )
    created_at = Column(DateTime(timezone=True), default=utcnow)

class UserGrant(Base):
    __tablename__ = 'user_grants'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("public.users.id"), nullable=False)
    grant_id = Column(UUID(as_uuid=True), ForeignKey("grants.id"), nullable=False)
    fit_category = Column(
        Enum("prime_match", "moderate_fit", "low_probability", name="fit_category"),
        nullable=False
    )
    agent_run_id = Column(UUID(as_uuid=True), nullable=True)
    applied = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    grant = relationship("Grant", backref="user_grants")

class VaultDocument(Base):
    __tablename__ = "vault_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("public.users.id"), nullable=False)
    name = Column(String, nullable=False)
    tag = Column(Enum(
        "legal", "tax", "cv", "financial", "organizational", "proposal", "other",
        name="document_tag"
    ), nullable=False)
    gcs_path = Column(String, nullable=False)
    file_type = Column(String, nullable=False)   # pdf, docx, etc
    file_size_bytes = Column(BigInteger, nullable=False)
    uploaded_at = Column(DateTime(timezone=True), default=utcnow)

    users = relationship("User", backref="vault_documents")

class ApplicationTracker(Base):
    __tablename__ = "application_tracker"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("public.users.id"), nullable=False)
    grant_id = Column(UUID(as_uuid=True), ForeignKey("grants.id"), nullable=False)
    agent_run_id = Column(UUID(as_uuid=True), ForeignKey("agent_runs.id"), nullable=True)
    status = Column(
        Enum(
            "pending",
            "outline_in_progress",
            "outline_review",
            "proposal_in_progress",
            "proposal_review",
            "submitted",
            "failed",
            "cancelled",
            name="application_status"
        ),
        default="pending"
    )
    cancel_requested = Column(Boolean, default=False)
    outline_gcs_path = Column(String, nullable=True)  # AG3 output
    proposal_gcs_path = Column(String, nullable=True)  # AG4 output
    budget_gcs_path = Column(String, nullable=True)  # AG4 budget output
    output_gcs_path = Column(String, nullable=True)   # final output doc
    started_at = Column(DateTime(timezone=True), default=utcnow)
    submitted_at = Column(DateTime(timezone=True), nullable=True)

    grant = relationship("Grant", backref="applications")
    agent_run = relationship("AgentRun", backref="applications")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("public.users.id"), nullable=False)
    type = Column(Enum("success", "failure", "info", name="notification_type"), nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

class ApplicationChat(Base):
    __tablename__ = "application_chats"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id = Column(UUID(as_uuid=True), ForeignKey("application_tracker.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("public.users.id"), nullable=False)
    role = Column(Enum("user", "agent", name="chat_role"), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    application = relationship("ApplicationTracker", backref="chats")