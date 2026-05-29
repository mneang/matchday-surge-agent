import { NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";

export async function GET() {
  try {
    const db = await getMongoDb();

    const businessProfile = await db.collection("business_profiles").findOne(
      { businessId: "la_restaurant_001" },
      { projection: { _id: 0 } }
    );

    const matchdayScenario = await db.collection("matchday_scenarios").findOne(
      { scenarioId: "wc2026_la_evening_match" },
      { projection: { _id: 0 } }
    );

    const readinessTemplate = await db.collection("readiness_templates").findOne(
      { templateId: "restaurant_surge_template" },
      { projection: { _id: 0 } }
    );

    if (!businessProfile || !matchdayScenario || !readinessTemplate) {
      return NextResponse.json(
        {
          ok: false,
          source: "mongodb",
          error:
            "Demo scenario data was not found. Run POST /api/seed before loading the scenario.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      source: "mongodb",
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
