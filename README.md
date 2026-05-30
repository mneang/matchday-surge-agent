# Matchday Surge Agent

**Matchday Surge Agent** is a MongoDB-backed operations agent that helps local businesses prepare for major matchday demand before crowds arrive.

The app loads a business profile, matchday scenario, and readiness template from MongoDB, uses Gemini to generate a tailored surge plan, and requires owner approval before producing a staff-ready brief.

**Live Demo:** https://matchday-surge-agent-54292544314.us-central1.run.app  
**Repository:** https://github.com/mneang/matchday-surge-agent  
**Hackathon:** Google Cloud Rapid Agent Hackathon  
**Partner Track:** MongoDB

---

## What it does

Local businesses near major matchday corridors can face sudden operational pressure: long lines, stockouts, staff overload, parking confusion, multilingual visitors, and unclear customer flow.

Matchday Surge Agent turns that pressure into a simple owner workflow:

1. **Choose a business profile** from MongoDB.
2. **Prepare a tailored plan** with Gemini.
3. **Review the plan** across staffing, stock, flow, and customer messages.
4. **Approve the brief** before it is treated as final.
5. **Reset and test another profile** when needed.

The agent does not auto-publish customer messages, claim exact crowd predictions, or imply official tournament affiliation. The owner stays in control.

---

## Demo scenarios

The demo includes three MongoDB-backed business profiles so the same agent pattern can adapt to different local matchday operations.

| Scenario | Business | Matchday pressure | Agent prepares |
|---|---|---|---|
| **Restaurant Rush** | Harbor Grill LA | Pre-match dining surge and post-match takeout spike | Staff roles, food stock, pickup flow, multilingual messages |
| **Market Stockout** | Pico Market | Drink demand, snack restocking, checkout lines | Cooler priorities, cashier coverage, aisle flow, customer instructions |
| **Parking Flow** | Metro Lot Crew | Arrival lanes, payment confusion, pedestrian movement | Crew assignments, lane flow, QR/payment signage, safety messaging |

---

## Demo walkthrough

**Command board:** choose a MongoDB-backed business profile, then prepare, review, and approve the matchday plan.

<img width="1262" height="859" alt="01-command-board" src="https://github.com/user-attachments/assets/db49f678-4573-4a08-a558-2aaa667491fd" />

**Review details:** the owner reviews next actions and customer messages before approval.

<img width="805" height="661" alt="02-review-details" src="https://github.com/user-attachments/assets/94950715-1014-401e-af7d-3416e6d0f173" />

**Approved output:** the plan becomes a staff-ready brief only after owner approval.

<img width="715" height="336" alt="03-approved-output" src="https://github.com/user-attachments/assets/a14b1770-693d-4154-be69-6c5e5385e465" />

---

## Agent workflow

The agent follows a controlled run pattern: load memory, generate a plan, require review, and save approval before the brief becomes final.

<img width="1536" height="444" alt="diagram1" src="https://github.com/user-attachments/assets/f69be78e-24be-450e-a889-e7b3de8409e3" />

Once the agent run starts, the selected profile locks. The owner can reset the run to test another business scenario.

---

## Architecture

The app is deployed on Cloud Run, uses MongoDB Atlas as operational memory, and calls Gemini through Google Cloud to generate structured plans.

<img width="1536" height="569" alt="diagram2" src="https://github.com/user-attachments/assets/3ba36148-0e6d-4f61-9ad8-dcf1acef5614" />

---

## MongoDB usage

MongoDB acts as the agent’s operational memory.

| Collection | Purpose |
|---|---|
| `business_profiles` | Stores business type, constraints, capacity, languages, priority items, and owner goals |
| `matchday_scenarios` | Stores matchday pressure patterns and local context |
| `readiness_templates` | Stores planning sections and guardrails by business type |
| `generated_plans` | Stores Gemini-generated plans pending owner approval |
| `approval_events` | Stores the approval audit trail for final briefs |

This lets the same workflow adapt across restaurants, markets, and parking operations without hardcoding a single demo path.

---

## Gemini usage

Gemini generates a structured readiness plan after the app retrieves the selected business profile, matchday scenario, and readiness template from MongoDB.

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

A deterministic fallback planner is included so the app remains demo-safe if model access is temporarily unavailable.

---

## Human approval and guardrails

Matchday Surge Agent is designed for reviewable operations planning, not automatic publishing.

Guardrails:

- No automatic customer communication
- No exact crowd or traffic predictions
- No official tournament logos, marks, or sponsorship claims
- No destructive business operations
- Owner approval required before the brief becomes final

Approval creates an event in MongoDB and unlocks the final staff-ready brief.

---

## Tech stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Backend:** Next.js API routes
- **Database:** MongoDB Atlas
- **AI:** Gemini on Google Cloud
- **Hosting:** Google Cloud Run
- **Secrets:** Google Cloud Secret Manager
- **Development:** GitHub Codespaces

---

## API routes

| Route | Purpose |
|---|---|
| `POST /api/seed` | Seeds MongoDB with demo profiles, scenarios, and readiness templates |
| `GET /api/scenario?businessId=...` | Loads a selected business profile, scenario, and template |
| `POST /api/agent/generate-plan` | Generates a Gemini-powered plan for the selected business |
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
MONGODB_URI="your-mongodb-atlas-connection-string"
MONGODB_DB="matchday_surge"

GOOGLE_CLOUD_PROJECT="your-google-cloud-project-id"
GOOGLE_CLOUD_LOCATION="us-central1"
GOOGLE_GENAI_USE_VERTEXAI="true"
GEMINI_MODEL="gemini-2.5-flash"
```

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

---

## Test commands

Generate a market scenario plan:

```bash
curl -X POST http://localhost:3000/api/agent/generate-plan \
  -H "Content-Type: application/json" \
  -d '{"businessId":"la_market_001"}'
```

Generate a parking scenario plan:

```bash
curl -X POST http://localhost:3000/api/agent/generate-plan \
  -H "Content-Type: application/json" \
  -d '{"businessId":"la_parking_001"}'
```

Approve a selected business plan:

```bash
curl -X POST http://localhost:3000/api/approval/finalize-plan \
  -H "Content-Type: application/json" \
  -d '{"businessId":"la_market_001"}'
```

Run quality checks:

```bash
npm run lint
npm run build
```

---

## Deployment

The live demo is deployed on Google Cloud Run.

Runtime configuration uses:

- `MONGODB_URI` from Secret Manager
- `MONGODB_DB`
- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_CLOUD_LOCATION`
- `GOOGLE_GENAI_USE_VERTEXAI`
- `GEMINI_MODEL`

---

## Legal and safety note

This is an independent demo project. It does not use official tournament logos, protected marks, or sponsorship claims. It does not claim exact crowd, traffic, or attendance predictions. Customer-facing messages require owner approval before being treated as final.
- Business-type-specific inventory quantity suggestions
- Run history view for past approved briefs
