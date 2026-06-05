import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: "Matchday Surge Agent",
    status: "ready",
    deployment: {
      platform: "Google Cloud Run",
      region: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
      project: process.env.GOOGLE_CLOUD_PROJECT || "matchday-surge-agent",
    },
    agent: {
      pattern:
        "MongoDB MCP context retrieval -> Gemini planning -> owner approval -> saved final brief",
      mcp: {
        enabled: true,
        server: "matchday-surge-mongodb-mcp",
        tool: "load_matchday_context",
        memory:
          "business_profiles, matchday_scenarios, readiness_templates, generated_plans, approval_events",
      },
      ai: {
        provider: "Google Cloud",
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        mode: "gemini_live",
      },
      guardrails: [
        "No exact crowd predictions",
        "No official tournament affiliation claims",
        "No auto-published customer messages",
        "Owner approval required before final brief",
      ],
    },
  });
}
