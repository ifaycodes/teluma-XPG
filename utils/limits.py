from fastapi import HTTPException

PLAN_LIMITS = {
    "free": {
        "feed_grants": 10,
        "vault_documents": 3,
        "storage_bytes": 10485760, # 10MB
        "num_of_drafts": 0,
        "can_apply": False,
    },
    "basic": {
        "feed_grants": None,        # unlimited
        "vault_documents": 20,
        "storage_bytes": 524288000, # 500MB
        "num_of_drafts": 10,
        "can_apply": True,
    },
    "pro": {
        "feed_grants": None,
        "vault_documents": None,
        "storage_bytes": 5368709120,  # 5GB
        "num_of_drafts": None,  # unlimited
        "can_apply": True,
    },
    "enterprise": {
        "feed_grants": None,
        "vault_documents": None,
        "storage_bytes": None,       # unlimited
        "num_of_draft": None,
        "can_apply": True,
    }
}


def check_can_apply(user):
    limits = PLAN_LIMITS[user.plan]
    if not limits["can_apply"]:
        raise HTTPException(
            status_code=403,
            detail="Upgrade to Basic or higher to apply for grants"
        )


def check_vault_limit(user, current_doc_count: int):
    limits = PLAN_LIMITS[user.plan]
    max_docs = limits["vault_documents"]
    if max_docs is not None and current_doc_count >= max_docs:
        raise HTTPException(
            status_code=403,
            detail=f"You've reached your document limit ({max_docs}). Upgrade to upload more."
        )


def check_agent_runs(user):
    limits = PLAN_LIMITS[user.plan]
    max_draft = limits["num_of_drafts"]
    if max_draft is not None and user.drafts_this_month >= max_draft:
        raise HTTPException(
            status_code=403,
            detail=f"You've used all your agent runs this month. Upgrade for more."
        )


def get_feed_limit(user) -> int | None:
    return PLAN_LIMITS[user.plan]["feed_grants"]