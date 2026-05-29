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

  return {
    summary: `${businessProfile.name} should prepare for a ${matchdayScenario.expectedPattern} by increasing front-of-house coverage, prioritizing fast-moving items, and simplifying service flow before kickoff.`,
    staffing: [
      `Schedule ${Math.min(
        businessProfile.maxStaff,
        businessProfile.normalStaff + 3
      )} staff during the ${matchdayScenario.recommendedPrepWindow} prep window.`,
      "Assign one person to manage pickup orders and one person to monitor queue length.",
      "Keep one flexible staff member available for post-match takeout demand.",
    ],
    inventory: [
      "Prioritize water, soft drinks, and grab-and-go meals.",
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
  const ai = new GoogleGenAI({
    vertexai: process.env.GOOGLE_GENAI_USE_VERTEXAI === "true",
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
