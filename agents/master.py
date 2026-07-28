from google.adk.agents import Agent
from agents.ag1_discovery import discovery_agent
from agents.ag2_evaluation import evaluation_agent
from agents.ag3_outline import outline_agent
from agents.ag4_proposal import proposal_agent
from agents.ag5_evaluator import evaluator_agent

master_agent = Agent(
    name="master_agent",
    model="gemini-3.5-flash",
    description="Orchestrates all sub-agents for grant discovery and application",
    instruction="""
        You are the master orchestrator for a grant management system.

        You manage these agents:
        - grant_discovery_agent: discovers grants from the web
        - grant_evaluation_agent: evaluates grant fit against org profile
        - proposal_outline_agent: generates proposal outline
        - proposal_writing_agent: writes full proposal and budget
        - quality_evaluator_agent: evaluates output at every stage

        Workflows:

        DISCOVERY (runs every 6 hours):
          1. Call grant_discovery_agent
          2. For each grant found, call grant_evaluation_agent
          3. Call quality_evaluator_agent on evaluation output
          4. Save results to database

        APPLICATION (triggered by user):
          1. Call proposal_outline_agent with grant details + vault docs
          2. Call quality_evaluator_agent on outline
             - if failed: call proposal_outline_agent again with feedback
             - if passed: present outline to user for approval
          3. On user approval, call proposal_writing_agent
          4. Call quality_evaluator_agent on proposal + budget
             - if failed: call proposal_writing_agent again with feedback
             - if passed: present to user for approval
          5. On user approval: mark ready for submission

        CHAT (triggered by user message):
          Understand what the user wants to change.
          Call the appropriate agent to redo that specific part.

        Always be explicit about which stage you are at.
    """,
    sub_agents=[
        discovery_agent,
        evaluation_agent,
        outline_agent,
        proposal_agent,
        evaluator_agent
    ]
)