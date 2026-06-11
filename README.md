# Matchday Surge Agent

**Matchday Surge Agent** is a MongoDB MCP-powered operations agent that helps local businesses prepare staff, resources, flow, and customer messages before matchday crowds arrive.

The agent loads operational memory from MongoDB through a MongoDB MCP tool server, generates a structured readiness plan with Gemini on Google Cloud, and requires owner approval before the plan becomes a staff-ready brief.

**Live Demo:** https://matchday-surge-agent-54292544314.us-central1.run.app  
**Repository:** https://github.com/mneang/matchday-surge-agent  
**Hackathon:** Google Cloud Rapid Agent Hackathon  
**Partner Track:** MongoDB

---

## Quick verification

The hosted app includes a health endpoint and a repeatable smoke test so reviewers can verify the deployed agent quickly.

```bash
curl -s https://matchday-surge-agent-54292544314.us-central1.run.app/api/health
```

Expected proof fields include:

```json
{
  "ok": true,
  "deployment": {
    "platform": "Google Cloud Run"
  },
  "agent": {
    "mcp": {
      "enabled": true,
      "server": "matchday-surge-mongodb-mcp",
      "tool": "load_matchday_context"
    },
    "ai": {
      "mode": "gemini_live"
    }
  }
}
```

Additional verification:

- [`docs/cloud-run-proof.md`](./docs/cloud-run-proof.md)
- [`scripts/smoke-test.sh`](./scripts/smoke-test.sh)
- [`scripts/deploy-cloud-run.sh`](./scripts/deploy-cloud-run.sh)

---

## What it does

Local businesses near major matchday corridors can face sudden operational pressure: long lines, stockouts, staff overload, parking confusion, multilingual visitors, and unclear customer flow.

Matchday Surge Agent turns that pressure into a controlled owner workflow:

1. **Choose a business profile** stored in MongoDB.
2. **Load operational context** through the MongoDB MCP tool server.
3. **Generate a tailored plan** with Gemini on Google Cloud.
4. **Review the plan** across staffing, resources, flow, risks, and customer messages.
5. **Approve the brief** before it is treated as final.
6. **Reset and test another profile** when needed.

The agent does not auto-publish messages, claim exact crowd predictions, or imply official tournament affiliation. The owner stays in control.

---

## Demo scenarios

The demo includes three MongoDB-backed business profiles so the same agent pattern can adapt across different local matchday operations.

| Scenario | Business | Matchday pressure | Agent prepares |
|---|---|---|---|
| **Restaurant Rush** | Harbor Grill LA | Pre-match dining surge and post-match takeout spike | Staff roles, food stock, pickup flow, multilingual messages |
| **Market Stockout** | Pico Market | Drink demand, snack restocking, checkout lines | Cooler priorities, cashier coverage, aisle flow, customer instructions |
| **Parking Flow** | Metro Lot Crew | Arrival lanes, payment confusion, pedestrian movement | Crew assignments, lane flow, QR/payment signage, safety messaging |

---

## Demo walkthrough

**Command board:** choose a MongoDB-backed profile, then prepare, review, approve, or reset the run.

<img width="1262" height="859" alt="01-command-board" src="https://github.com/user-attachments/assets/db49f678-4573-4a08-a558-2aaa667491fd" />

**Review details:** the owner reviews operational actions and customer messages before approval.

<img width="805" height="661" alt="02-review-details" src="https://github.com/user-attachments/assets/94950715-1014-401e-af7d-3416e6d0f173" />

**Approved output:** the plan becomes a staff-ready brief only after owner approval.

<img width="715" height="336" alt="03-approved-output" src="https://github.com/user-attachments/assets/a14b1770-693d-4154-be69-6c5e5385e465" />

---

## Why it is agentic

Matchday Surge Agent is not a static prompt wrapper. Each run follows a controlled tool-and-approval loop:

1. The selected business profile is locked for the run.
2. The backend calls the MongoDB MCP tool server.
3. The MCP tool loads the business profile, matchday scenario, readiness template, and guardrails from MongoDB.
4. Gemini generates a structured readiness plan from that retrieved context.
5. The app validates the plan shape and retries malformed structured output.
6. The owner reviews the plan before approval.
7. The final approval event is saved back to MongoDB.

**The agent can recommend. The owner decides.**

---

## Agent workflow

The agent follows a controlled run pattern: load operational memory through MongoDB MCP, generate a structured plan with Gemini, require owner review, and save an approval event before the brief becomes final.

<img width="1536" height="444" alt="diagram1" src="https://github.com/user-attachments/assets/f69be78e-24be-450e-a889-e7b3de8409e3" />

Once the agent run starts, the selected profile locks. The owner can reset the run to test another business scenario.

---

## Architecture

The app is deployed on Google Cloud Run. The agent route uses a MongoDB MCP tool server to retrieve operational context from MongoDB Atlas, then calls Gemini on Google Cloud to generate a structured matchday plan.

<img width="1536" height="569" alt="diagram2" src="https://github.com/user-attachments/assets/3ba36148-0e6d-4f61-9ad8-dcf1acef5614" />

---

## MongoDB MCP usage

MongoDB acts as the agent’s operational memory. The MongoDB MCP tool server exposes that memory to the agent route as tool-based context.

### MongoDB collections

| Collection | Purpose |
|---|---|
| `business_profiles` | Stores business type, constraints, capacity, languages, priority items, and owner goals |
| `matchday_scenarios` | Stores matchday pressure patterns and local context |
| `readiness_templates` | Stores planning sections and guardrails by business type |
| `generated_plans` | Stores generated plans pending owner approval |
| `approval_events` | Stores the approval audit trail for final briefs |

### MCP tools

| MCP tool | Purpose |
|---|---|
| `list_matchday_profiles` | Lists available local business profiles stored in MongoDB |
| `load_matchday_context` | Loads the selected business profile, matchday scenario, and readiness template |

The agent route calls `load_matchday_context` before Gemini generates the plan. That keeps the model grounded in the selected business profile instead of relying on a generic prompt.

---

## Gemini usage

Gemini generates a structured readiness plan after the agent retrieves selected context through the MongoDB MCP tool server.

Inputs include:

- business profile
- matchday scenario
- readiness template
- business constraints
- priority items
- language needs
- guardrails

The generated plan includes:

- summary
- staffing plan
- inventory or resource plan
- service-flow plan
- English, Spanish, and French customer messages
- risk notes
- owner checklist
- approval requirement

---

## Reliability choices

The app is designed to stay stable during a live demo while still using real Gemini generation.

- Gemini output is requested as `application/json`.
- The generated plan shape is validated before it is accepted.
- Malformed structured output is retried up to three times.
- A deterministic fallback planner keeps the workflow usable if model access is temporarily unavailable.
- Owner approval is required before the final brief is saved.

This keeps the system practical for a judging environment while still showing live model-backed planning.

---

## Human approval and guardrails

Matchday Surge Agent is designed for reviewable operations planning, not automatic publishing.

Guardrails:

- No automatic customer communication
- No exact crowd, traffic, or attendance predictions
- No official tournament logos, protected marks, or sponsorship claims
- No destructive business operations
- Owner approval required before the brief becomes final

Approval creates an event in MongoDB and unlocks the final staff-ready brief.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Backend | Next.js API routes |
| Agent tooling | MongoDB MCP tool server |
| Database | MongoDB Atlas |
| AI | Gemini on Google Cloud |
| Hosting | Google Cloud Run |
| Secrets | Google Cloud Secret Manager |
| Development | GitHub Codespaces |

---

## API routes

| Route | Purpose |
|---|---|
| `GET /api/health` | Returns Cloud Run, MongoDB MCP, Gemini, and guardrail proof |
| `POST /api/seed` | Seeds MongoDB with demo profiles, scenarios, and readiness templates |
| `GET /api/scenario?businessId=...` | Loads a selected business profile, scenario, and template |
| `POST /api/agent/generate-plan` | Calls the MongoDB MCP tool server, loads selected context, and generates a Gemini-powered plan |
| `POST /api/approval/finalize-plan` | Approves the selected pending plan and saves the approval event |

---

## Local setup

Clone the repository:

```bash
git clone https://github.com/mneang/matchday-surge-agent.git
cd matchday-surge-agent
```

Install dependencies:

```bash
npm install
```

Create `.env.local`:

```bash
MONGODB_URI="mongodb+srv://<user>:<password>@<cluster-url>/?appName=<app-name>"
MONGODB_DB="matchday_surge"

GOOGLE_CLOUD_PROJECT="<your-google-cloud-project-id>"
GOOGLE_CLOUD_LOCATION="us-central1"
GOOGLE_GENAI_USE_VERTEXAI="true"
GEMINI_MODEL="gemini-2.5-flash"
```

Do not commit `.env.local`. The hosted Cloud Run deployment reads `MONGODB_URI` from Google Cloud Secret Manager.

Run locally:

```bash
npm run dev
```

Seed demo data:

```bash
curl -X POST http://localhost:3000/api/seed
```

Open:

```text
http://localhost:3000
```

The MCP server is used by the backend agent route when it calls the local `mcp/mongodb-matchday-server.mjs` tool server.

---

## Test commands

Run quality checks:

```bash
npm run lint
npm run build
```

Run the hosted smoke test:

```bash
APP_URL="https://matchday-surge-agent-54292544314.us-central1.run.app" ./scripts/smoke-test.sh
```

Generate a market scenario plan locally:

```bash
curl -X POST http://localhost:3000/api/agent/generate-plan   -H "Content-Type: application/json"   -d '{"businessId":"la_market_001"}'
```

Generate a parking scenario plan locally:

```bash
curl -X POST http://localhost:3000/api/agent/generate-plan   -H "Content-Type: application/json"   -d '{"businessId":"la_parking_001"}'
```

Approve a selected business plan locally:

```bash
curl -X POST http://localhost:3000/api/approval/finalize-plan   -H "Content-Type: application/json"   -d '{"businessId":"la_market_001"}'
```

---

## Deployment

The live demo is deployed on Google Cloud Run.

```bash
./scripts/deploy-cloud-run.sh
```

Runtime configuration uses:

- `MONGODB_URI` from Secret Manager
- `MONGODB_DB`
- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_CLOUD_LOCATION`
- `GOOGLE_GENAI_USE_VERTEXAI`
- `GEMINI_MODEL`

Deployment proof:

```bash
curl -s https://matchday-surge-agent-54292544314.us-central1.run.app/api/health
```

For a full hosted verification path, see [`docs/cloud-run-proof.md`](./docs/cloud-run-proof.md).

---

## Findings and learnings

- A useful agent needs a visible control loop, not just a good model response.
- MongoDB MCP made the boundary clear: operational memory lives in MongoDB, and the agent retrieves it through tools.
- Business owners need short, reviewable actions more than long AI essays.
- Structured output needs reliability hardening. The app requests JSON, validates plan fields, retries malformed output, and falls back only if needed.
- Human approval is part of the product design: recommendations should not become final operational instructions without owner review.

---

## Legal and safety note

This is an independent demo project. It does not use official tournament logos, protected marks, or sponsorship claims. It does not claim exact crowd, traffic, or attendance predictions. Customer-facing messages require owner approval before being treated as final.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
