import { NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";
import { loadMatchdayContextViaMcp } from "@/lib/mcpContext";
import {
  generateMatchdayPlanWithGemini,
  getFallbackMatchdayPlan,
} from "@/lib/gemini";
import {
  AgentRun,
  BusinessProfile,
  MatchdayPlan,
  MatchdayScenario,
  ReadinessTemplate,
} from "@/lib/types";

function buildAgentRun(args: {
  businessProfile: BusinessProfile;
  matchdayScenario: MatchdayScenario;
  readinessTemplate: ReadinessTemplate;
  matchdayPlan: MatchdayPlan;
  mode: "gemini_live" | "deterministic_fallback";
  contextSource: "mongodb_mcp" | "mongodb_driver";
}): AgentRun {
  const {
    businessProfile,
    matchdayScenario,
    readinessTemplate,
    matchdayPlan,
    mode,
    contextSource,
  } = args;

  const contextTool =
    contextSource === "mongodb_mcp"
      ? "MongoDB MCP tool server"
      : "MongoDB Node.js driver fallback";

  return {
    agentName: "Matchday Surge Agent",
    runType: "local_business_matchday_surge_planning",
    goal:
      "Prepare a local business for a major tournament matchday surge without overstaffing, stockouts, or confusing customer communication.",
    plan: [
      "Load the local business profile through the MongoDB MCP tool server.",
      "Load the matchday scenario through the MongoDB MCP tool server.",
      "Load the readiness template and guardrails through the MongoDB MCP tool server.",
      "Generate a matchday surge readiness plan with Gemini.",
      "Require owner approval before the plan is treated as final.",
    ],
    toolsUsed: [
      {
        step: "Load business profile",
        tool: `${contextTool}: business_profiles`,
        status: "success",
      },
      {
        step: "Load matchday scenario",
        tool: `${contextTool}: matchday_scenarios`,
        status: "success",
      },
      {
        step: "Load readiness template",
        tool: `${contextTool}: readiness_templates`,
        status: "success",
      },
      {
        step: "Generate readiness plan",
        tool:
          mode === "gemini_live"
            ? "Gemini on Google Cloud"
            : "Deterministic fallback planner",
        status: mode === "gemini_live" ? "success" : "fallback",
      },
    ],
    observations: [
      `${businessProfile.name} operates in the ${businessProfile.area}.`,
      `The scenario expects ${matchdayScenario.expectedPattern}.`,
      `Primary risk factors include ${matchdayScenario.riskFactors.join(", ")}.`,
      `The readiness template includes ${readinessTemplate.sections.join(", ")}.`,
    ],
    decision: {
      surgeRisk: "high",
      likelyPressurePoint: "staffing, resources, service flow, and customer communication",
      decisionSummary:
        "The business should prepare for a concentrated matchday surge by using the selected operating profile, planning around known constraints, and approving customer-facing messages before use.",
      confidence: mode === "gemini_live" ? "high" : "medium-high",
      recommendedOwnerAction:
        "Review and approve the matchday surge plan before sharing customer-facing messages or briefing staff.",
      approvalRequired: matchdayPlan.approvalRequired,
    },
    guardrails: [
      "The agent does not claim exact crowd predictions.",
      "The agent does not use official tournament logos or imply official sponsorship.",
      "The agent does not automatically publish customer messages.",
      "The agent requires owner approval before finalizing the plan.",
    ],
    finalArtifact: {
      type: "owner_approved_matchday_surge_brief",
      status: "pending_owner_approval",
      title: "Owner-Approved Matchday Surge Brief",
    },
  };
}

async function loadContextWithDriverFallback(businessId: string) {
  const db = await getMongoDb();

  const businessProfile = (await db.collection("business_profiles").findOne(
    { businessId },
    { projection: { _id: 0 } }
  )) as BusinessProfile | null;

  if (!businessProfile) {
    throw new Error(`Missing business profile: ${businessId}`);
  }

  const scenarioId =
    typeof (businessProfile as BusinessProfile & { scenarioId?: string })
      ?.scenarioId === "string"
      ? (businessProfile as BusinessProfile & { scenarioId: string }).scenarioId
      : "wc2026_restaurant_rush";

  const templateId =
    typeof (businessProfile as BusinessProfile & { templateId?: string })
      ?.templateId === "string"
      ? (businessProfile as BusinessProfile & { templateId: string }).templateId
      : "restaurant_surge_template";

  const matchdayScenario = (await db.collection("matchday_scenarios").findOne(
    { scenarioId },
    { projection: { _id: 0 } }
  )) as MatchdayScenario | null;

  const readinessTemplate = (await db.collection("readiness_templates").findOne(
    { templateId },
    { projection: { _id: 0 } }
  )) as ReadinessTemplate | null;

  if (!matchdayScenario || !readinessTemplate) {
    throw new Error("Missing scenario or readiness template.");
  }

  return {
    businessProfile,
    matchdayScenario,
    readinessTemplate,
  };
}

export async function POST(request: Request) {
  const db = await getMongoDb();

  let requestedBusinessId = "la_restaurant_001";

  try {
    const body = await request.json();
    if (typeof body?.businessId === "string" && body.businessId.trim()) {
      requestedBusinessId = body.businessId;
    }
  } catch {
    // No JSON body provided. Use default demo profile.
  }

  let contextSource: "mongodb_mcp" | "mongodb_driver" = "mongodb_mcp";
  let businessProfile: BusinessProfile;
  let matchdayScenario: MatchdayScenario;
  let readinessTemplate: ReadinessTemplate;

  try {
    const mcpContext = await loadMatchdayContextViaMcp(requestedBusinessId);
    businessProfile = mcpContext.businessProfile;
    matchdayScenario = mcpContext.matchdayScenario;
    readinessTemplate = mcpContext.readinessTemplate;
  } catch (error) {
    contextSource = "mongodb_driver";
    console.error("MongoDB MCP unavailable, used driver fallback:", error);

    const fallbackContext = await loadContextWithDriverFallback(
      requestedBusinessId
    );

    businessProfile = fallbackContext.businessProfile;
    matchdayScenario = fallbackContext.matchdayScenario;
    readinessTemplate = fallbackContext.readinessTemplate;
  }

  const input = {
    businessProfile,
    matchdayScenario,
    readinessTemplate,
  };

  let mode: "gemini_live" | "deterministic_fallback" = "gemini_live";
  let matchdayPlan: MatchdayPlan;

  try {
    matchdayPlan = await generateMatchdayPlanWithGemini(input);
  } catch (error) {
    mode = "deterministic_fallback";
    matchdayPlan = getFallbackMatchdayPlan(input);
    console.error("Gemini unavailable, used fallback planner:", error);
  }

  const agentRun = buildAgentRun({
    businessProfile,
    matchdayScenario,
    readinessTemplate,
    matchdayPlan,
    mode,
    contextSource,
  });

  const generatedPlan = {
    planId: `plan_${businessProfile.businessId}_${Date.now()}`,
    businessId: businessProfile.businessId,
    scenarioId: matchdayScenario.scenarioId,
    status: "pending_owner_approval",
    mode,
    contextSource,
    matchdayPlan,
    agentRun,
    createdAt: new Date().toISOString(),
  };

  await db.collection("generated_plans").insertOne(generatedPlan);

  return NextResponse.json({
    ok: true,
    mode,
    source: {
      database: contextSource,
      ai: mode === "gemini_live" ? "gemini" : "fallback",
    },
    mcp: {
      enabled: contextSource === "mongodb_mcp",
      server: "matchday-surge-mongodb-mcp",
      tool: "load_matchday_context",
    },
    businessProfile,
    matchdayScenario,
    readinessTemplate,
    matchdayPlan,
    agentRun,
    generatedPlan: {
      planId: generatedPlan.planId,
      status: generatedPlan.status,
      createdAt: generatedPlan.createdAt,
    },
    approvalRequired: true,
  });
}
