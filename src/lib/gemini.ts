import { GoogleGenAI } from "@google/genai";
import {
  BusinessProfile,
  MatchdayPlan,
  MatchdayScenario,
  ReadinessTemplate,
} from "@/lib/types";

type PlannerInput = {
  businessProfile: BusinessProfile;
  matchdayScenario: MatchdayScenario;
  readinessTemplate: ReadinessTemplate;
};

const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function extractJson(text: string) {
  const cleaned = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("Gemini response did not contain JSON.");
  }

  return cleaned.slice(firstBrace, lastBrace + 1);
}

export function getFallbackMatchdayPlan(input: PlannerInput): MatchdayPlan {
  const { businessProfile, matchdayScenario } = input;
  const type = businessProfile.businessType.toLowerCase();

  if (type.includes("parking")) {
    return {
      summary: `${businessProfile.name} should prepare for ${matchdayScenario.expectedPattern} by assigning clear lane roles, reducing payment confusion, protecting pedestrian movement, and staging visible signage before the arrival window.`,
      staffing: [
        `Schedule up to ${businessProfile.maxStaff} crew members during the ${matchdayScenario.recommendedPrepWindow} prep window.`,
        "Assign dedicated roles for entry lane direction, QR/payment support, pedestrian crossing watch, and rideshare/pickup zone guidance.",
        "Keep one floating crew member available to relieve bottlenecks or redirect vehicles during the peak arrival and exit windows.",
      ],
      inventory: [
        "Prioritize lane signs, QR payment signs, safety cones, reflective vests, and pickup zone markers.",
        "Stage cones and signs before the arrival surge so drivers can understand the flow without asking staff.",
        "Keep backup signage and spare reflective gear available for post-match congestion.",
      ],
      serviceFlow: [
        "Separate prepaid, QR/payment, and assistance-needed lanes where space allows.",
        "Place pedestrian crossing markers and staff at the highest-conflict walking points.",
        "Create a clear rideshare/pickup handoff area away from entry lanes to reduce gridlock.",
      ],
      customerMessages: {
        english:
          "Matchday parking is open. Please follow lane signs, use QR payment where available, and watch for pedestrian crossing points.",
        spanish:
          "El estacionamiento para el día de partido está abierto. Siga las señales de carril, use el pago por QR si está disponible y tenga cuidado en los cruces peatonales.",
        french:
          "Le stationnement du jour de match est ouvert. Suivez les panneaux de voie, utilisez le paiement QR si disponible et faites attention aux passages piétons.",
      },
      riskNotes: [
        "This plan is a readiness recommendation, not an exact traffic forecast.",
        "Payment confusion, pedestrian crossings, and rideshare congestion may create bottlenecks.",
        "Owner approval is required before using customer-facing messages.",
      ],
      ownerChecklist: [
        "Confirm crew schedule and lane roles.",
        "Stage cones, vests, lane signs, and QR/payment signs.",
        "Mark pedestrian crossing and rideshare/pickup zones.",
        "Brief crew on entry flow, payment support, and post-match exit pressure.",
        "Approve customer-facing parking messages.",
      ],
      approvalRequired: true,
    };
  }

  if (type.includes("convenience") || type.includes("market")) {
    return {
      summary: `${businessProfile.name} should prepare for ${matchdayScenario.expectedPattern} by prioritizing cold drinks, fast checkout, aisle flow, and multilingual customer instructions.`,
      staffing: [
        `Schedule up to ${businessProfile.maxStaff} staff during the ${matchdayScenario.recommendedPrepWindow} prep window.`,
        "Assign one person to checkout, one to cooler/drink restock, and one to aisle flow or customer questions.",
        "Keep a flexible staff member ready for post-match restock pressure.",
      ],
      inventory: [
        "Prioritize water, sports drinks, snacks, ice, and phone chargers.",
        "Load coolers with the fastest-moving drinks before the pre-match rush.",
        "Create a small post-match reserve for drinks and snacks.",
      ],
      serviceFlow: [
        "Keep aisles clear and move high-demand items closer to checkout if possible.",
        "Use a simple express checkout lane for drinks and snacks.",
        "Post short multilingual signs for checkout, cold drinks, and sold-out alternatives.",
      ],
      customerMessages: {
        english:
          "Cold drinks, snacks, and essentials are ready for matchday. Please use the express line for quick checkout.",
        spanish:
          "Bebidas frías, snacks y artículos esenciales están listos para el día de partido. Use la fila rápida para pagar más pronto.",
        french:
          "Boissons fraîches, snacks et essentiels sont prêts pour le jour de match. Utilisez la file express pour un passage rapide.",
      },
      riskNotes: [
        "This plan is a readiness recommendation, not an exact crowd forecast.",
        "Cooler space, checkout lines, and aisle crowding may limit service speed.",
        "Owner approval is required before using customer-facing messages.",
      ],
      ownerChecklist: [
        "Confirm cashier and restock coverage.",
        "Stock water, sports drinks, snacks, ice, and chargers.",
        "Create an express checkout flow.",
        "Post multilingual signs for cold drinks and quick checkout.",
        "Approve customer-facing messages.",
      ],
      approvalRequired: true,
    };
  }

  return {
    summary: `${businessProfile.name} should prepare for ${matchdayScenario.expectedPattern} by increasing coverage, prioritizing fast-moving menu items, and simplifying service flow before kickoff.`,
    staffing: [
      `Schedule up to ${businessProfile.maxStaff} staff during the ${matchdayScenario.recommendedPrepWindow} prep window.`,
      "Assign clear roles for kitchen, register, pickup, drinks, and floor support.",
      "Keep one flexible staff member available for post-match takeout demand.",
    ],
    inventory: [
      "Prioritize water, soft drinks, grab-and-go meals, rice bowls, and tacos.",
      "Pre-pack high-demand items before the pre-match surge window.",
      "Hold back a small post-match reserve for late demand.",
    ],
    serviceFlow: [
      "Create a simple matchday menu with fewer customizations.",
      "Separate dine-in, pickup, and quick-order lines if space allows.",
      "Post wait-time expectations clearly near the entrance.",
    ],
    customerMessages: {
      english:
        "Matchday menu available today. Express pickup starts before kickoff.",
      spanish:
        "Menú de día de partido disponible hoy. La recogida rápida empieza antes del inicio.",
      french:
        "Menu de jour de match disponible aujourd’hui. La file rapide commence avant le coup d’envoi.",
    },
    riskNotes: [
      "This plan is a readiness recommendation, not an exact crowd forecast.",
      "Parking and queue pressure may affect customer wait times.",
      "Owner approval is required before publishing customer-facing messages.",
    ],
    ownerChecklist: [
      "Confirm staff schedule.",
      "Confirm matchday menu.",
      "Confirm inventory reserve.",
      "Approve customer-facing messages.",
      "Brief staff before the prep window begins.",
    ],
    approvalRequired: true,
  };
}

export async function generateMatchdayPlanWithGemini(
  input: PlannerInput
): Promise<MatchdayPlan> {
  const useVertexAi = process.env.GOOGLE_GENAI_USE_VERTEXAI !== "false";

  const ai = new GoogleGenAI({
    vertexai: useVertexAi,
    project: process.env.GOOGLE_CLOUD_PROJECT,
    location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
  });

  const prompt = `
You are Matchday Surge Agent, a World Cup matchday operations planning agent for local businesses.

Your job:
Generate a practical readiness plan for a local business preparing for a major tournament matchday crowd surge.

Use only the provided business profile, matchday scenario, and readiness template.

Safety and scope rules:
- Do not claim exact crowd predictions.
- Do not imply official tournament sponsorship.
- Do not use official logos, slogans, or protected marks.
- Do not automatically publish customer messages.
- Require owner approval before the plan is treated as final.
- Keep the output practical for a small business manager.

Return ONLY valid JSON with this exact shape:
{
  "summary": "string",
  "staffing": ["string"],
  "inventory": ["string"],
  "serviceFlow": ["string"],
  "customerMessages": {
    "english": "string",
    "spanish": "string",
    "french": "string"
  },
  "riskNotes": ["string"],
  "ownerChecklist": ["string"],
  "approvalRequired": true
}

Business profile:
${JSON.stringify(input.businessProfile, null, 2)}

Matchday scenario:
${JSON.stringify(input.matchdayScenario, null, 2)}

Readiness template:
${JSON.stringify(input.readinessTemplate, null, 2)}
`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });

  const text = response.text ?? "";
  const parsed = JSON.parse(extractJson(text)) as MatchdayPlan;

  return {
    ...parsed,
    approvalRequired: true,
  };
}
