import { NextRequest, NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    const db = await getMongoDb();
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId") ?? "la_restaurant_001";

    const businessProfiles = await db
      .collection("business_profiles")
      .find({}, { projection: { _id: 0 } })
      .sort({ businessId: 1 })
      .toArray();

    const businessProfile = await db.collection("business_profiles").findOne(
      { businessId },
      { projection: { _id: 0 } }
    );

    if (!businessProfile) {
      return NextResponse.json(
        {
          ok: false,
          source: "mongodb",
          error: `Business profile not found for ${businessId}. Run POST /api/seed first.`,
        },
        { status: 404 }
      );
    }

    const scenarioId =
      typeof businessProfile.scenarioId === "string"
        ? businessProfile.scenarioId
        : "wc2026_restaurant_rush";

    const templateId =
      typeof businessProfile.templateId === "string"
        ? businessProfile.templateId
        : "restaurant_surge_template";

    const matchdayScenario = await db.collection("matchday_scenarios").findOne(
      { scenarioId },
      { projection: { _id: 0 } }
    );

    const readinessTemplate = await db.collection("readiness_templates").findOne(
      { templateId },
      { projection: { _id: 0 } }
    );

    if (!matchdayScenario || !readinessTemplate) {
      return NextResponse.json(
        {
          ok: false,
          source: "mongodb",
          error: "Scenario or readiness template was not found. Run POST /api/seed first.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      source: "mongodb",
      selectedBusinessId: businessId,
      businessProfiles,
      businessProfile,
      matchdayScenario,
      readinessTemplate,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        source: "mongodb",
        error:
          error instanceof Error
            ? error.message
            : "Unknown MongoDB scenario retrieval error",
      },
      { status: 500 }
    );
  }
}
