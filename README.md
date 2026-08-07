# Teluma

**Your Funding and Growth OS.**

Teluma finds grants your organization actually qualifies for, tells you how strong a fit each one is, and drafts the application for you — grounded in your own documents, not generic boilerplate.

## The problem

Grant funding is scattered across foundation portals, government PDFs, and funding boards that nobody indexes well. Even when you find an opportunity, you don't know if you qualify until you've read a 60-page RFP — and then you still have to write the thing: the same organizational history and budget narrative, re-typed and re-argued for every funder.

## How it works

1. **Discover** — An AI agent scans the web on a schedule, surfacing active grants with funding amount, deadline, and eligibility details straight into your feed.
2. **Match** — Upload your organization's documents (pitch decks, financials, past proposals) to your Vault. Every discovered grant is scored against them and sorted into Prime Match, Moderate Fit, or Low Probability, so you know where you actually stand before spending time on an application.
3. **Draft** — Apply to a match and an agent drafts a proposal outline grounded in your vault documents. Approve it, and it writes the full proposal and budget. Chat with the agent to request changes — a headline, a budget line, tone — before you submit.
4. **Watch it work** — Every discovery run and every draft in progress shows a real step-by-step log of what the agent is doing, not just a spinner.

## Stack

- **Backend** — FastAPI + SQLAlchemy + Postgres (Supabase), Google ADK/Gemini agents, Google Cloud Storage for documents and drafts
- **Frontend** — Next.js (App Router) + Tailwind
- **Payments** — [Bachs](https://bachs.io)
- **Email** — [SendByte](https://sendbyte.africa)

## Getting started

Backend:

```bash
pip install -r requirements.txt
cp .env.example .env   # fill in your own values
uvicorn main:app --reload
```

Frontend:

```bash
cd teluma-frontend
npm install
npm run dev
```

See [`.env.example`](.env.example) for the full list of required environment variables, and [`scripts/create_bachs_products.py`](scripts/create_bachs_products.py) for setting up billing plans.
