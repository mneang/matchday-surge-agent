# Cloud Run Deployment Proof

Live demo:

https://matchday-surge-agent-54292544314.us-central1.run.app

## Hosted health check

```bash
curl -s https://matchday-surge-agent-54292544314.us-central1.run.app/api/health
```

Expected proof fields:

```json
{
  "ok": true,
  "status": "ready",
  "deployment": {
    "platform": "Google Cloud Run",
    "region": "us-central1"
  },
  "agent": {
    "pattern": "MongoDB MCP context retrieval -> Gemini planning -> owner approval -> saved final brief",
    "mcp": {
      "enabled": true,
      "server": "matchday-surge-mongodb-mcp",
      "tool": "load_matchday_context"
    },
    "ai": {
      "provider": "Google Cloud",
      "mode": "gemini_live"
    }
  }
}
```

## Agent generation proof

```bash
curl -s -X POST https://matchday-surge-agent-54292544314.us-central1.run.app/api/agent/generate-plan \
  -H "Content-Type: application/json" \
  -d '{"businessId":"la_parking_001"}'
```

Expected proof fields:

```json
{
  "mode": "gemini_live",
  "source": {
    "database": "mongodb_mcp",
    "ai": "gemini"
  },
  "mcp": {
    "enabled": true,
    "server": "matchday-surge-mongodb-mcp",
    "tool": "load_matchday_context"
  }
}
```

## Repeatable smoke test

```bash
APP_URL="https://matchday-surge-agent-54292544314.us-central1.run.app" ./scripts/smoke-test.sh
```

The smoke test verifies:

- Cloud Run health endpoint
- MongoDB demo data seeding
- scenario retrieval
- MongoDB MCP context loading
- Gemini live plan generation
- owner approval event creation
- final approved brief output
