from fastapi import HTTPException

PLAN_LIMITS = {
    "free": {
        "feed_grants": 10,          # 10 matched grants max to protect grant names from search bypass
        "vault_documents": 3,       # 3 core Vault documents
        "storage_bytes": None,
        "num_of_drafts": 1,         # 1 sample AI-drafted proposal total
        "can_apply": True,
    },
    "basic": {
        "feed_grants": None,        # unlimited feed matches
        "vault_documents": 10,      # 10 Vault documents
        "storage_bytes": None,
        "num_of_drafts": 5,         # 5 proposals/mo
        "can_apply": True,
    },
    "pro": {
        "feed_grants": None,        # unlimited feed matches
        "vault_documents": 50,      # 50 Vault documents
        "storage_bytes": None,
        "num_of_drafts": None,      # unlimited proposals
        "can_apply": True,
    },
    "enterprise": {
        "feed_grants": None,        # unlimited feed matches
        "vault_documents": None,    # unlimited Vault documents
        "storage_bytes": None,      # unlimited
        "num_of_drafts": None,      # unlimited proposals
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