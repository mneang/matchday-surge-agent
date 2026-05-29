import { NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";
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
}): AgentRun {
  const {
    businessProfile,
    matchdayScenario,
    readinessTemplate,
    matchdayPlan,
    mode,
  } = args;

  return {
    agentName: "Matchday Surge Agent",
    runType: "local_business_matchday_surge_planning",
    goal:
      "Prepare a local business for a major tournament matchday surge without overstaffing, stockouts, or confusing customer communication.",
    plan: [
      "Load the local business profile from MongoDB.",
      "Load the matchday scenario from MongoDB.",
      "Load the readiness template and guardrails from MongoDB.",
      "Generate a matchday surge readiness plan.",
      "Require owner approval before the plan is treated as final.",
    ],
    toolsUsed: [
      {
        step: "Load business profile",
        tool: "MongoDB business_profiles",
        status: "success",
      },
      {
        step: "Load matchday scenario",
        tool: "MongoDB matchday_scenarios",
        status: "success",
      },
      {
        step: "Load readiness template",
        tool: "MongoDB readiness_templates",
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
      `The scenario expects a ${matchdayScenario.expectedPattern}.`,
      `Primary risk factors include ${matchdayScenario.riskFactors.join(", ")}.`,
      `The readiness template includes ${readinessTemplate.sections.join(", ")}.`,
    ],
    decision: {
      surgeRisk: "high",
      likelyPressurePoint: "staffing, inventory, and queue flow",
      decisionSummary:
        "The business should prepare for a concentrated matchday surge by increasing coverage, simplifying service flow, prioritizing fast-moving inventory, and preparing multilingual customer messages.",
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

export async function POST() {
  const db = await getMongoDb();

  const businessProfile = (await db.collection("business_profiles").findOne(
    { businessId: "la_restaurant_001" },
    { projection: { _id: 0 } }
  )) as BusinessProfile | null;

  const matchdayScenario = (await db.collection("matchday_scenarios").findOne(
    { scenarioId: "wc2026_la_evening_match" },
    { projection: { _id: 0 } }
  )) as MatchdayScenario | null;

  const readinessTemplate = (await db.collection("readiness_templates").findOne(
    { templateId: "restaurant_surge_template" },
    { projection: { _id: 0 } }
  )) as ReadinessTemplate | null;

  if (!businessProfile || !matchdayScenario || !readinessTemplate) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Missing demo data. Run POST /api/seed before generating a plan.",
      },
      { status: 404 }
    );
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
  });

  const generatedPlan = {
    planId: `plan_${businessProfile.businessId}_${Date.now()}`,
    businessId: businessProfile.businessId,
    scenarioId: matchdayScenario.scenarioId,
    status: "pending_owner_approval",
    mode,
    matchdayPlan,
    agentRun,
    createdAt: new Date().toISOString(),
  };

  await db.collection("generated_plans").insertOne(generatedPlan);

  return NextResponse.json({
    ok: true,
    mode,
    source: {
      database: "mongodb",
      ai: mode === "gemini_live" ? "gemini" : "fallback",
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
