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

function assertMatchdayPlan(value: MatchdayPlan) {
  if (!value.summary || typeof value.summary !== "string") {
    throw new Error("Gemini JSON missing summary.");
  }

  if (!Array.isArray(value.staffing)) {
    throw new Error("Gemini JSON missing staffing array.");
  }

  if (!Array.isArray(value.inventory)) {
    throw new Error("Gemini JSON missing inventory array.");
  }

  if (!Array.isArray(value.serviceFlow)) {
    throw new Error("Gemini JSON missing serviceFlow array.");
  }

  if (!value.customerMessages?.english) {
    throw new Error("Gemini JSON missing customerMessages.english.");
  }

  if (!value.customerMessages?.spanish) {
    throw new Error("Gemini JSON missing customerMessages.spanish.");
  }

  if (!value.customerMessages?.french) {
    throw new Error("Gemini JSON missing customerMessages.french.");
  }

  if (!Array.isArray(value.riskNotes)) {
    throw new Error("Gemini JSON missing riskNotes array.");
  }

  if (!Array.isArray(value.ownerChecklist)) {
    throw new Error("Gemini JSON missing ownerChecklist array.");
  }
}

export function getFallbackMatchdayPlan(input: PlannerInput): MatchdayPlan {
  const { businessProfile, matchdayScenario } = input;

  const isParking = businessProfile.businessType === "parking operator";
  const isMarket = businessProfile.businessType === "convenience store";

  return {
    summary: isParking
      ? `${businessProfile.name} should prepare for ${matchdayScenario.expectedPattern} by assigning clear crew roles, separating entry and exit movement, improving payment signage, and protecting pedestrian crossing points.`
      : isMarket
      ? `${businessProfile.name} should prepare for ${matchdayScenario.expectedPattern} by prioritizing fast-moving items, checkout flow, cooler access, and short multilingual customer messages.`
      : `${businessProfile.name} should prepare for ${matchdayScenario.expectedPattern} by increasing coverage, prioritizing fast-moving items, and simplifying service flow before kickoff.`,
    staffing: isParking
      ? [
          `Schedule up to ${businessProfile.maxStaff} crew members during the ${matchdayScenario.recommendedPrepWindow} prep window.`,
          "Assign one crew member to entry lanes, one to payment support, one to pedestrian crossing visibility, and one floating lead for congestion points.",
          "Brief the crew on lane assignments, safety language, and escalation rules before arrivals begin.",
        ]
      : [
          `Schedule up to ${businessProfile.maxStaff} staff during the ${matchdayScenario.recommendedPrepWindow} prep window.`,
          "Assign one person to manage pickup or checkout pressure and one person to monitor queue length.",
          "Keep one flexible staff member available for post-match demand.",
        ],
    inventory: isParking
      ? [
          "Prioritize lane signs, QR payment signs, cones, reflective vests, and pickup zone markers.",
          "Place payment and direction signs before drivers reach the decision point.",
          "Keep backup cones and markers ready for post-match pedestrian and rideshare congestion.",
        ]
      : [
          `Prioritize ${businessProfile.priorityItems.slice(0, 5).join(", ")}.`,
          "Pre-position high-demand items before the pre-match surge window.",
          "Hold back a small post-match reserve for late demand.",
        ],
    serviceFlow: isParking
      ? [
          "Separate entry, exit, rideshare, and pedestrian movement as early as possible.",
          "Use visible staff positions to prevent drivers from stopping in crossing zones.",
          "Create a simple post-match reset plan for exit lanes and rideshare pickup pressure.",
        ]
      : [
          "Create a simple matchday menu or quick-buy path with fewer decisions.",
          "Separate dine-in, pickup, checkout, and quick-order lines if space allows.",
          "Post wait-time and pickup expectations clearly near the entrance.",
        ],
    customerMessages: isParking
      ? {
          english:
            "Matchday parking is active. Please follow posted lane signs, prepare payment before entry, and watch for pedestrian crossing points.",
          spanish:
            "El estacionamiento de día de partido está activo. Siga las señales de carril, prepare el pago antes de entrar y tenga cuidado con los cruces peatonales.",
          french:
            "Le stationnement de jour de match est en cours. Suivez les panneaux de voie, préparez le paiement avant l’entrée et surveillez les passages piétons.",
        }
      : {
          english:
            "Matchday service is active. Please follow posted signs, use the express option when available, and ask staff for help.",
          spanish:
            "El servicio de día de partido está activo. Siga las señales, use la opción rápida si está disponible y pida ayuda al personal.",
          french:
            "Le service de jour de match est en cours. Suivez les panneaux, utilisez l’option rapide si disponible et demandez de l’aide au personnel.",
        },
    riskNotes: [
      "This plan is a readiness recommendation, not an exact crowd forecast.",
      `${matchdayScenario.riskFactors.slice(0, 3).join(", ")} are the primary pressure points.`,
      "Owner approval is required before using customer-facing messages.",
    ],
    ownerChecklist: [
      "Confirm staff schedule.",
      "Confirm priority resources and signage.",
      "Confirm service flow and queue plan.",
      "Approve customer-facing messages.",
      "Brief staff before the prep window begins.",
    ],
    approvalRequired: true,
  };
}

function buildPrompt(input: PlannerInput, attempt: number) {
  return `
You are Matchday Surge Agent, a matchday operations planning agent for local businesses.

Generate a practical readiness plan for a local business preparing for a major tournament matchday crowd surge.

Use only the provided business profile, matchday scenario, and readiness template.

Safety and scope rules:
- Do not claim exact crowd predictions.
- Do not imply official tournament sponsorship.
- Do not use official logos, slogans, or protected marks.
- Do not automatically publish customer messages.
- Require owner approval before the plan is treated as final.
- Keep the output practical for a small business manager.
- Keep each array item concise and operational.
- Avoid markdown formatting inside JSON strings.
- Avoid trailing commas.
- Return valid JSON only.

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

Attempt number: ${attempt}

Business profile:
${JSON.stringify(input.businessProfile, null, 2)}

Matchday scenario:
${JSON.stringify(input.matchdayScenario, null, 2)}

Readiness template:
${JSON.stringify(input.readinessTemplate, null, 2)}
`;
}

export async function generateMatchdayPlanWithGemini(
  input: PlannerInput
): Promise<MatchdayPlan> {
  const ai = new GoogleGenAI({
    vertexai: process.env.GOOGLE_GENAI_USE_VERTEXAI === "true",
    project: process.env.GOOGLE_CLOUD_PROJECT,
    location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
  });

  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: buildPrompt(input, attempt),
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      const text = response.text ?? "";
      const parsed = JSON.parse(extractJson(text)) as MatchdayPlan;

      assertMatchdayPlan(parsed);

      return {
        ...parsed,
        approvalRequired: true,
      };
    } catch (error) {
      lastError = error;
      console.error(`Gemini structured JSON attempt ${attempt} failed:`, error);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Gemini failed to return valid structured JSON.");
}
