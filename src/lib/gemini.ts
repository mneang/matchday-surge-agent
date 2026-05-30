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
  const businessType = businessProfile.businessType.toLowerCase();

  if (businessType.includes("parking")) {
    return {
      summary: `${businessProfile.name} should prepare for ${matchdayScenario.expectedPattern} by assigning clear crew roles, separating entry and exit movement, improving payment signage, and protecting pedestrian crossing points.`,
      staffing: [
        `Schedule up to ${businessProfile.maxStaff} crew members during the ${matchdayScenario.recommendedPrepWindow} prep window.`,
        "Assign one crew member to entry lanes, one to payment support, one to pedestrian crossing visibility, and one floating lead for congestion points.",
        "Brief the crew on lane assignments, safety language, and escalation rules before arrivals begin.",
      ],
      inventory: [
        "Prioritize lane signs, QR payment signs, cones, reflective vests, and pickup zone markers.",
        "Place payment and direction signs before drivers reach the decision point.",
        "Keep backup cones and markers ready for post-match pedestrian and rideshare congestion.",
      ],
      serviceFlow: [
        "Separate entry, exit, rideshare, and pedestrian movement as early as possible.",
        "Use visible staff positions to prevent drivers from stopping in crossing zones.",
        "Create a simple post-match reset plan for exit lanes and rideshare pickup pressure.",
      ],
      customerMessages: {
        english:
          "Matchday parking is active. Please follow posted lane signs, prepare payment before entry, and watch for pedestrian crossing points.",
        spanish:
          "El estacionamiento de día de partido está activo. Siga las señales de carril, prepare el pago antes de entrar y tenga cuidado con los cruces peatonales.",
        french:
          "Le stationnement de jour de match est en cours. Suivez les panneaux de voie, préparez le paiement avant l’entrée et surveillez les passages piétons.",
      },
      riskNotes: [
        "This plan is a readiness recommendation, not an exact traffic forecast.",
        "Entry lane backups, payment confusion, and pedestrian crossings are the primary safety pressure points.",
        "Owner approval is required before using customer-facing messages.",
      ],
      ownerChecklist: [
        "Confirm crew schedule and lane assignments.",
        "Place QR payment and directional signs before entry points.",
        "Set cones and pedestrian crossing markers.",
        "Brief staff on safety and congestion procedures.",
        "Approve customer-facing messages.",
      ],
      approvalRequired: true,
    };
  }

  if (businessType.includes("market") || businessType.includes("convenience")) {
    return {
      summary: `${businessProfile.name} should prepare for ${matchdayScenario.expectedPattern} by prioritizing cold drinks, fast checkout flow, aisle control, and simple multilingual customer instructions.`,
      staffing: [
        `Schedule ${Math.min(
          businessProfile.maxStaff,
          businessProfile.normalStaff + 2
        )} staff during the ${matchdayScenario.recommendedPrepWindow} prep window.`,
        "Assign one cashier lead, one cooler/restock lead, and one floor monitor for aisle crowding.",
        "Keep one flexible staff member ready for post-match restock pressure.",
      ],
      inventory: [
        "Prioritize water, sports drinks, snacks, ice, and phone chargers.",
        "Pre-stock coolers and keep backup drink inventory close to the front.",
        "Create a small reserve for post-match demand instead of selling through all stock before kickoff.",
      ],
      serviceFlow: [
        "Keep aisles clear and move high-demand drinks toward fast-access areas.",
        "Use a simplified checkout flow with clear lines and payment instructions.",
        "Post quick signs for water, snacks, chargers, checkout, and exit flow.",
      ],
      customerMessages: {
        english:
          "Matchday essentials are available today. Cold drinks, snacks, ice, and chargers are near the front for faster checkout.",
        spanish:
          "Productos esenciales para el día de partido disponibles hoy. Bebidas frías, snacks, hielo y cargadores están cerca de la entrada para pagar más rápido.",
        french:
          "Les essentiels de jour de match sont disponibles aujourd’hui. Boissons fraîches, snacks, glace et chargeurs sont près de l’entrée pour un passage rapide en caisse.",
      },
      riskNotes: [
        "This plan is a readiness recommendation, not an exact crowd forecast.",
        "Cooler congestion, checkout lines, and aisle crowding are the primary pressure points.",
        "Owner approval is required before using customer-facing messages.",
      ],
      ownerChecklist: [
        "Confirm cashier and restock coverage.",
        "Stock coolers with priority drinks.",
        "Move fast-selling items near checkout.",
        "Print or post multilingual customer signs.",
        "Approve customer-facing messages.",
      ],
      approvalRequired: true,
    };
  }

  return {
    summary: `${businessProfile.name} should prepare for ${matchdayScenario.expectedPattern} by increasing service coverage, prioritizing fast-moving items, and simplifying guest flow before kickoff.`,
    staffing: [
      `Schedule ${Math.min(
        businessProfile.maxStaff,
        businessProfile.normalStaff + 3
      )} staff during the ${matchdayScenario.recommendedPrepWindow} prep window.`,
      "Assign clear roles for kitchen, register, pickup, floor support, and runner coverage.",
      "Keep one flexible staff member available for post-match takeout demand.",
    ],
    inventory: [
      "Prioritize water, soft drinks, grab-and-go meals, tacos, rice bowls, and packaging.",
      "Pre-pack high-demand items before the pre-match surge window.",
      "Hold back a small post-match reserve for late takeout demand.",
    ],
    serviceFlow: [
      "Create a simplified matchday menu with fewer customizations.",
      "Separate dine-in, pickup, and quick-order lines if space allows.",
      "Post wait-time and pickup expectations clearly near the entrance.",
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
