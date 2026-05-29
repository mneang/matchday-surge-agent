import { NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";

export async function POST() {
  try {
    const db = await getMongoDb();

    const businessProfile = {
      businessId: "la_restaurant_001",
      name: "Harbor Grill LA",
      city: "Los Angeles",
      area: "Inglewood stadium district",
      businessType: "restaurant",
      normalStaff: 5,
      maxStaff: 9,
      normalCapacity: 60,
      peakCapacity: 95,
      languages: ["English", "Spanish", "French"],
      constraints: [
        "small kitchen",
        "limited parking",
        "high takeout demand",
        "limited cold storage",
      ],
      priorityItems: [
        "water",
        "grab-and-go meals",
        "rice bowls",
        "tacos",
        "soft drinks",
      ],
      ownerGoal:
        "Prepare for a major tournament matchday surge without overstaffing, running out of key items, or confusing visiting customers.",
    };

    const matchdayScenario = {
      scenarioId: "wc2026_la_evening_match",
      eventName: "2026 World Cup matchday",
      hostCity: "Los Angeles",
      venueArea: "Inglewood stadium district",
      kickoffWindow: "evening",
      expectedPattern: "pre-match dining surge and post-match takeout spike",
      recommendedPrepWindow: "4-6 hours before kickoff",
      riskFactors: [
        "long queues",
        "inventory stockouts",
        "staff overload",
        "multilingual visitors",
        "parking congestion",
      ],
      localContext:
        "The business is near a major matchday corridor where visiting fans may arrive before kickoff and look for quick meals, drinks, and clear pickup options.",
    };

    const readinessTemplate = {
      templateId: "restaurant_surge_template",
      businessType: "restaurant",
      sections: [
        "staffing",
        "inventory",
        "serviceFlow",
        "customerMessages",
        "riskNotes",
        "ownerChecklist",
      ],
      guardrails: [
        "Do not claim exact crowd predictions.",
        "Do not use official tournament logos or imply official sponsorship.",
        "Do not automatically publish customer messages.",
        "Require owner approval before finalizing the plan.",
      ],
    };

    await db.collection("business_profiles").updateOne(
      { businessId: businessProfile.businessId },
      { $set: businessProfile },
      { upsert: true }
    );

    await db.collection("matchday_scenarios").updateOne(
      { scenarioId: matchdayScenario.scenarioId },
      { $set: matchdayScenario },
      { upsert: true }
    );

    await db.collection("readiness_templates").updateOne(
      { templateId: readinessTemplate.templateId },
      { $set: readinessTemplate },
      { upsert: true }
    );

    return NextResponse.json({
      ok: true,
      source: "mongodb",
      message: "Seeded Matchday Surge Agent demo data.",
      seeded: {
        businessProfile: businessProfile.businessId,
        matchdayScenario: matchdayScenario.scenarioId,
        readinessTemplate: readinessTemplate.templateId,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        source: "mongodb",
        error: error instanceof Error ? error.message : "Unknown MongoDB seed error",
      },
      { status: 500 }
    );
  }
}
