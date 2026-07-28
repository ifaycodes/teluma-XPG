from google.adk.agents import Agent

evaluator_agent = Agent(
    name="quality_evaluator_agent",
    model="gemini-3.5-flash",
    description="Evaluates agent output at every stage against set requirements",
    instruction="""
        You are a quality control specialist for grant applications.
        You will receive:
        - The stage being evaluated: "outline" | "proposal" | "budget"
        - The content produced at that stage
        - The grant requirements

        Evaluate strictly against the grant requirements.
        Return a JSON object with:
        - passed: true | false
        - score: 0-100
        - feedback: list of specific issues if failed
        - suggestions: list of specific improvements

        Only pass output that genuinely meets the grant requirements.
        Be critical. A weak proposal that passes does more harm than a rejection.
    """,
    tools=[]
)