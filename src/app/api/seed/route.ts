import { NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";

const businessProfiles = [
  {
    businessId: "la_restaurant_001",
    scenarioId: "wc2026_restaurant_rush",
    templateId: "restaurant_surge_template",
    name: "Harbor Grill LA",
    city: "Los Angeles",
    area: "Inglewood stadium district",
    businessType: "restaurant",
    normalStaff: 5,
    maxStaff: 9,
    normalCapacity: 60,
    peakCapacity: 95,
    languages: ["English", "Spanish", "French"],
    constraints: ["small kitchen", "limited parking", "high takeout demand", "limited cold storage"],
    priorityItems: ["water", "grab-and-go meals", "rice bowls", "tacos", "soft drinks"],
    ownerGoal:
      "Prepare for a major tournament matchday surge without overstaffing, running out of key items, or confusing visiting customers.",
  },
  {
    businessId: "la_market_001",
    scenarioId: "wc2026_market_stockout",
    templateId: "market_surge_template",
    name: "Pico Market",
    city: "Los Angeles",
    area: "matchday walking corridor",
    businessType: "convenience store",
    normalStaff: 3,
    maxStaff: 6,
    normalCapacity: 35,
    peakCapacity: 80,
    languages: ["English", "Spanish", "French"],
    constraints: ["small checkout area", "limited cooler space", "high bottled drink demand", "narrow aisles"],
    priorityItems: ["water", "sports drinks", "snacks", "ice", "phone chargers"],
    ownerGoal:
      "Prepare for matchday foot traffic without running out of drinks, creating long checkout lines, or confusing visitors.",
  },
  {
    businessId: "la_parking_001",
    scenarioId: "wc2026_parking_flow",
    templateId: "parking_flow_template",
    name: "Metro Lot Crew",
    city: "Los Angeles",
    area: "stadium approach zone",
    businessType: "parking operator",
    normalStaff: 4,
    maxStaff: 8,
    normalCapacity: 120,
    peakCapacity: 220,
    languages: ["English", "Spanish", "French"],
    constraints: ["limited entry lanes", "pedestrian crossing pressure", "cashless payment confusion", "rideshare congestion"],
    priorityItems: ["lane signs", "QR payment signs", "safety cones", "reflective vests", "pickup zone markers"],
    ownerGoal:
      "Prepare for matchday vehicle and pedestrian flow without gridlock, payment confusion, or unsafe crossing points.",
  },
];

const matchdayScenarios = [
  {
    scenarioId: "wc2026_restaurant_rush",
    eventName: "2026 World Cup matchday",
    hostCity: "Los Angeles",
    venueArea: "Inglewood stadium district",
    kickoffWindow: "evening",
    expectedPattern: "pre-match dining surge and post-match takeout spike",
    recommendedPrepWindow: "4-6 hours before kickoff",
    riskFactors: ["long queues", "inventory stockouts", "staff overload", "multilingual visitors", "parking congestion"],
    localContext:
      "The business is near a major matchday corridor where visiting fans may arrive before kickoff and look for quick meals, drinks, and clear pickup options.",
  },
  {
    scenarioId: "wc2026_market_stockout",
    eventName: "2026 World Cup matchday",
    hostCity: "Los Angeles",
    venueArea: "matchday walking corridor",
    kickoffWindow: "afternoon/evening",
    expectedPattern: "pre-match drink rush and post-match snack restock pressure",
    recommendedPrepWindow: "3-5 hours before kickoff",
    riskFactors: ["water stockouts", "long checkout lines", "cooler congestion", "multilingual visitors", "aisle crowding"],
    localContext:
      "The market sits along a walking route where fans may stop for cold drinks, snacks, chargers, and quick essentials before and after the match.",
  },
  {
    scenarioId: "wc2026_parking_flow",
    eventName: "2026 World Cup matchday",
    hostCity: "Los Angeles",
    venueArea: "stadium approach zone",
    kickoffWindow: "evening",
    expectedPattern: "arrival vehicle surge and post-match pedestrian/rideshare congestion",
    recommendedPrepWindow: "5-7 hours before kickoff",
    riskFactors: ["entry lane backups", "payment confusion", "unsafe pedestrian crossings", "rideshare congestion", "staff overload"],
    localContext:
      "The parking team manages a high-pressure arrival and exit window where clear lanes, signage, payment flow, and pedestrian safety matter.",
  },
];

const readinessTemplates = [
  {
    templateId: "restaurant_surge_template",
    businessType: "restaurant",
    sections: ["staffing", "inventory", "serviceFlow", "customerMessages", "riskNotes", "ownerChecklist"],
    guardrails: [
      "Do not claim exact crowd predictions.",
      "Do not use official tournament logos or imply official sponsorship.",
      "Do not automatically publish customer messages.",
      "Require owner approval before finalizing the plan.",
    ],
  },
  {
    templateId: "market_surge_template",
    businessType: "convenience store",
    sections: ["staffing", "inventory", "checkoutFlow", "customerMessages", "riskNotes", "ownerChecklist"],
    guardrails: [
      "Do not claim exact crowd predictions.",
      "Do not use official tournament logos or imply official sponsorship.",
      "Do not automatically publish customer messages.",
      "Require owner approval before finalizing the plan.",
    ],
  },
  {
    templateId: "parking_flow_template",
    businessType: "parking operator",
    sections: ["staffing", "laneFlow", "signage", "customerMessages", "riskNotes", "ownerChecklist"],
    guardrails: [
      "Do not claim exact traffic predictions.",
      "Do not use official tournament logos or imply official sponsorship.",
      "Do not automatically publish customer messages.",
      "Require owner approval before finalizing the plan.",
    ],
  },
];

export async function POST() {
  try {
    const db = await getMongoDb();

    await Promise.all(
      businessProfiles.map((profile) =>
        db.collection("business_profiles").updateOne(
          { businessId: profile.businessId },
          { $set: profile },
          { upsert: true }
        )
      )
    );

    await Promise.all(
      matchdayScenarios.map((scenario) =>
        db.collection("matchday_scenarios").updateOne(
          { scenarioId: scenario.scenarioId },
          { $set: scenario },
          { upsert: true }
        )
      )
    );

    await Promise.all(
      readinessTemplates.map((template) =>
        db.collection("readiness_templates").updateOne(
          { templateId: template.templateId },
          { $set: template },
          { upsert: true }
        )
      )
    );

    return NextResponse.json({
      ok: true,
      source: "mongodb",
      message: "Seeded multi-scenario Matchday Surge Agent demo data.",
      seeded: {
        businessProfiles: businessProfiles.map((item) => item.businessId),
        matchdayScenarios: matchdayScenarios.map((item) => item.scenarioId),
        readinessTemplates: readinessTemplates.map((item) => item.templateId),
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
