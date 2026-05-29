export type BusinessProfile = {
  businessId: string;
  name: string;
  city: string;
  area: string;
  businessType: string;
  normalStaff: number;
  maxStaff: number;
  normalCapacity: number;
  peakCapacity: number;
  languages: string[];
  constraints: string[];
  priorityItems: string[];
  ownerGoal: string;
};

export type MatchdayScenario = {
  scenarioId: string;
  eventName: string;
  hostCity: string;
  venueArea: string;
  kickoffWindow: string;
  expectedPattern: string;
  recommendedPrepWindow: string;
  riskFactors: string[];
  localContext: string;
};

export type ReadinessTemplate = {
  templateId: string;
  businessType: string;
  sections: string[];
  guardrails: string[];
};

export type MatchdayPlan = {
  summary: string;
  staffing: string[];
  inventory: string[];
  serviceFlow: string[];
  customerMessages: {
    english: string;
    spanish: string;
    french: string;
  };
  riskNotes: string[];
  ownerChecklist: string[];
  approvalRequired: boolean;
};

export type AgentRun = {
  agentName: string;
  runType: string;
  goal: string;
  plan: string[];
  toolsUsed: {
    step: string;
    tool: string;
    status: "success" | "fallback" | "error";
  }[];
  observations: string[];
  decision: {
    surgeRisk: "low" | "medium" | "high";
    likelyPressurePoint: string;
    decisionSummary: string;
    confidence: "low" | "medium" | "medium-high" | "high";
    recommendedOwnerAction: string;
    approvalRequired: boolean;
  };
  guardrails: string[];
  finalArtifact: {
    type: string;
    status: "pending_owner_approval" | "approved" | "fallback_ready";
    title: string;
  };
};
