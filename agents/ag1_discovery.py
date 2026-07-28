from google.adk.agents import Agent
from google.adk.tools import google_search
from datetime import datetime, timezone


def cleanup_expired_grants(db) -> None:
    from models import Grant, UserGrant
    now = datetime.now(timezone.utc)
    expired = db.query(Grant).filter(Grant.deadline < now).all()
    for grant in expired:
        db.query(UserGrant).filter(UserGrant.grant_id == grant.id).delete()
        db.delete(grant)
    db.commit()


discovery_agent = Agent(
    name="grant_discovery_agent",
    model="gemini-3.5-flash",
    description="Discovers relevant grants by searching the web",
    instruction="""
        You are a grant discovery specialist. 
        Search for active grants and funding opportunities.
        For each grant found extract:
        - name
        - funding amount
        - deadline
        - description
        - required document
        - link
        - eligibility requirements
        -restrictions such as word limit etc

        Only return grants with clear deadlines that have not passed.
        Return results as a JSON list.
    """,
    tools=[google_search]
)