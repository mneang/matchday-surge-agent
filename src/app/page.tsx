"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";

type BusinessProfile = {
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

type MatchdayScenario = {
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

type MatchdayPlan = {
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

type AgentRun = {
  decision: {
    surgeRisk: "low" | "medium" | "high";
    likelyPressurePoint: string;
    decisionSummary: string;
    confidence: "low" | "medium" | "medium-high" | "high";
    recommendedOwnerAction: string;
    approvalRequired: boolean;
  };
};

type GeneratePlanResponse = {
  ok: boolean;
  mode: "gemini_live" | "deterministic_fallback";
  source: {
    database: string;
    ai: string;
  };
  businessProfile: BusinessProfile;
  matchdayScenario: MatchdayScenario;
  matchdayPlan: MatchdayPlan;
  agentRun: AgentRun;
  generatedPlan: {
    planId: string;
    status: string;
    createdAt: string;
  };
  approvalRequired: boolean;
  error?: string;
};

type ScenarioProfile = {
  businessId: string;
  label: string;
  name: string;
  area: string;
  pressure: string;
  tone: "green" | "yellow" | "blue";
};

const scenarioProfiles: ScenarioProfile[] = [
  {
    businessId: "la_restaurant_001",
    label: "Restaurant Rush",
    name: "Harbor Grill LA",
    area: "Inglewood stadium district",
    pressure: "dining + takeout",
    tone: "green",
  },
  {
    businessId: "la_market_001",
    label: "Market Stockout",
    name: "Pico Market",
    area: "matchday walking corridor",
    pressure: "drinks + checkout",
    tone: "yellow",
  },
  {
    businessId: "la_parking_001",
    label: "Parking Flow",
    name: "Metro Lot Crew",
    area: "stadium approach zone",
    pressure: "lanes + pedestrians",
    tone: "blue",
  },
];

type ApprovalResponse = {
  ok: boolean;
  source: string;
  approvalEvent: {
    approvalId: string;
    planId: string;
    approvedBy: string;
    status: string;
    approvedAt: string;
  };
  finalBrief: {
    title: string;
    planId: string;
    status: string;
    summary: string;
    sections: {
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
    };
    approvalNote: string;
  };
  error?: string;
};

function cleanText(value: string) {
  return value
    .replaceAll("**", "")
    .replaceAll("`", "")
    .replace(/\s+/g, " ")
    .trim();
}

function firstSentence(items: string[] | undefined, fallback: string) {
  if (!items || items.length === 0) return fallback;
  const text = cleanText(items[0]);
  return text.split(/(?<=[.!?])\s+/)[0];
}

function shortPhrase(value: string, max = 96) {
  const text = cleanText(value);
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}

function StatusChip({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "green" | "yellow" | "blue" | "purple";
}) {
  const styles = {
    green: "border-emerald-300/35 bg-emerald-300/10 text-emerald-100",
    yellow: "border-yellow-300/35 bg-yellow-300/10 text-yellow-100",
    blue: "border-sky-300/35 bg-sky-300/10 text-sky-100",
    purple: "border-fuchsia-300/35 bg-fuchsia-300/10 text-fuchsia-100",
    neutral: "border-white/15 bg-white/[0.06] text-slate-200",
  };

  return (
    <span
      className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${styles[tone]}`}
    >
      {children}
    </span>
  );
}

function StepRail({
  stage,
}: {
  stage: "start" | "review" | "approved";
}) {
  const steps = [
    {
      number: "1",
      label: "Prepare",
      status:
        stage === "start"
          ? "Start here"
          : stage === "review"
          ? "Done"
          : "Done",
      active: stage === "start",
      done: stage !== "start",
    },
    {
      number: "2",
      label: "Review",
      status:
        stage === "start"
          ? "Locked"
          : stage === "review"
          ? "Now"
          : "Done",
      active: stage === "review",
      done: stage === "approved",
    },
    {
      number: "3",
      label: "Approve",
      status:
        stage === "approved"
          ? "Done"
          : stage === "review"
          ? "Ready"
          : "Locked",
      active: stage === "approved",
      done: stage === "approved",
    },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {steps.map((step) => (
        <div
          key={step.number}
          className={`rounded-full border px-4 py-3 ${
            step.done
              ? "border-emerald-300/35 bg-emerald-300/10"
              : step.active
              ? "border-yellow-300/40 bg-yellow-300/10"
              : "border-white/10 bg-white/[0.04]"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${
                  step.done || step.active
                    ? "bg-white text-slate-950"
                    : "bg-white/10 text-slate-400"
                }`}
              >
                {step.number}
              </span>
              <span className="text-sm font-black uppercase tracking-[0.16em] text-white">
                {step.label}
              </span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
              {step.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function PlayCard({
  label,
  title,
  detail,
  icon,
  tone,
}: {
  label: string;
  title: string;
  detail: string;
  icon: string;
  tone: "green" | "yellow" | "blue" | "purple";
}) {
  const styles = {
    green: "border-emerald-300/25 bg-emerald-300/10",
    yellow: "border-yellow-300/25 bg-yellow-300/10",
    blue: "border-sky-300/25 bg-sky-300/10",
    purple: "border-fuchsia-300/25 bg-fuchsia-300/10",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.22 }}
      className={`rounded-[1.75rem] border p-5 ${styles[tone]}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
            {label}
          </p>
          <h3 className="mt-3 text-2xl font-black leading-tight text-white">
            {title}
          </h3>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
      <p className="mt-4 text-sm font-semibold leading-6 text-slate-300">
        {detail}
      </p>
    </motion.div>
  );
}

function ProofMini({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "green" | "yellow" | "blue" | "purple";
}) {
  const styles = {
    green: "border-emerald-300/20 bg-emerald-300/10",
    yellow: "border-yellow-300/20 bg-yellow-300/10",
    blue: "border-sky-300/20 bg-sky-300/10",
    purple: "border-fuchsia-300/20 bg-fuchsia-300/10",
    neutral: "border-white/10 bg-white/[0.04]",
  };

  return (
    <div className={`rounded-2xl border p-4 ${styles[tone]}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-black leading-5 text-white">{value}</p>
    </div>
  );
}

function LanguageCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "yellow" | "blue";
}) {
  return <ProofMini label={label} value={value} tone={tone} />;
}

export default function Home() {
  const [planResult, setPlanResult] = useState<GeneratePlanResponse | null>(
    null
  );
  const [approvalResult, setApprovalResult] = useState<ApprovalResponse | null>(
    null
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [showProof, setShowProof] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState("la_restaurant_001");
  const [error, setError] = useState<string | null>(null);

  const business = planResult?.businessProfile;
  const scenario = planResult?.matchdayScenario;
  const plan = planResult?.matchdayPlan;
  const finalBrief = approvalResult?.finalBrief;
  const selectedScenario =
    scenarioProfiles.find((item) => item.businessId === selectedBusinessId) ??
    scenarioProfiles[0];

  const stage: "start" | "review" | "approved" = finalBrief
    ? "approved"
    : plan
    ? "review"
    : "start";

  const isRunLocked = Boolean(plan) || isGenerating || isApproving;

  const plays = useMemo(() => {
    return {
      staff: plan
        ? "Run max coverage with clear kitchen, register, pickup, and floor roles."
        : "Assign kitchen, register, pickup, and floor roles before the rush.",
      stock: plan
        ? "Prioritize water, soft drinks, grab-and-go meals, tacos, and rice bowls."
        : "Identify fast-moving food and drink items for the matchday window.",
      flow: plan
        ? "Use a simplified menu with clear dine-in and pickup lanes."
        : "Prepare a simple order flow before crowds arrive.",
      message: plan
        ? "English, Spanish, and French customer messages are ready."
        : "Prepare short customer messages in English, Spanish, and French.",
      checklist: firstSentence(
        plan?.ownerChecklist,
        "Confirm staffing, stock, signage, service flow, and customer messages."
      ),
    };
  }, [plan]);

  const topStatus =
    stage === "approved"
      ? "Approved output ready."
      : stage === "review"
      ? "Review the plays, then approve."
      : "Start by preparing the plan.";

  async function generatePlan() {
    setIsGenerating(true);
    setApprovalResult(null);
    setError(null);
    setShowDetails(false);

    try {
      const response = await fetch("/api/agent/generate-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessId: selectedBusinessId,
        }),
      });

      const data = (await response.json()) as GeneratePlanResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to generate matchday surge plan.");
      }

      setPlanResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function approvePlan() {
    setIsApproving(true);
    setError(null);

    try {
      const response = await fetch("/api/approval/finalize-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessId: selectedBusinessId,
          planId: planResult?.generatedPlan.planId,
        }),
      });

      const data = (await response.json()) as ApprovalResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to approve matchday surge brief.");
      }

      setApprovalResult(data);
      setShowDetails(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setIsApproving(false);
    }
  }

  function resetRun() {
    setPlanResult(null);
    setApprovalResult(null);
    setError(null);
    setShowProof(false);
    setShowDetails(false);
  }

  function toggleReviewDetails() {
    if (!plan) return;

    setShowDetails((current) => {
      const next = !current;

      if (next) {
        window.setTimeout(() => {
          document
            .getElementById("review-details")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 80);
      }

      return next;
    });
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#030712] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-45">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_15%,#16a34a_0,transparent_27%),radial-gradient(circle_at_85%_20%,#facc15_0,transparent_18%),radial-gradient(circle_at_50%_95%,#0284c7_0,transparent_20%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:76px_76px]" />
      </div>

      <div className="relative mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:px-6">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#060a14]/95 shadow-2xl shadow-black/50">
          <div className="grid lg:grid-cols-[0.75fr_1.25fr]">
            <div className="relative flex min-h-[460px] flex-col justify-between bg-[radial-gradient(circle_at_top_left,#16a34a_0,#052e16_34%,#020617_78%)] p-6 md:p-8">
              <div className="flex flex-wrap gap-2">
                <StatusChip tone="green">MongoDB</StatusChip>
                <StatusChip tone="green">Gemini</StatusChip>
                <StatusChip tone="yellow">Owner approval</StatusChip>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.34em] text-emerald-200">
                  Matchday Surge Agent
                </p>
                <h1 className="mt-4 text-6xl font-black leading-[0.86] tracking-tight md:text-8xl">
                  Rush ready.
                </h1>
                <p className="mt-6 max-w-xl text-lg font-semibold leading-8 text-slate-200">
                  One matchday operating plan for staff, stock, service flow,
                  and customer messages.
                </p>
              </div>

              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-100/70">
                Prepare · Stock · Approve · Ready
              </p>
            </div>

            <div className="grid gap-5 bg-[linear-gradient(135deg,#111827_0%,#020617_55%,#1c1400_100%)] p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.34em] text-yellow-200">
                    Matchday command board
                  </p>
                  <h2 className="mt-3 text-3xl font-black md:text-4xl">
                    Choose. Prepare. Approve.
                  </h2>
                </div>
                <StatusChip
                  tone={
                    stage === "approved"
                      ? "green"
                      : stage === "review"
                      ? "yellow"
                      : "blue"
                  }
                >
                  {stage === "approved"
                    ? "Complete"
                    : stage === "review"
                    ? "Review required"
                    : "Ready"}
                </StatusChip>
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
                      1 · Choose profile
                    </p>
                    <p className="mt-1 text-lg font-black text-white">
                      Select the business scenario.
                    </p>
                  </div>
                  <StatusChip tone={isRunLocked ? "green" : selectedScenario.tone}>
                    {isRunLocked ? "Locked during run" : selectedScenario.label}
                  </StatusChip>
                </div>

                <p className="mt-2 text-xs font-bold leading-5 text-slate-400">
                  {isRunLocked
                    ? "Reset the run to choose a different profile."
                    : "The profile locks as soon as Prepare starts."}
                </p>

                <div className="mt-4 grid gap-2 md:grid-cols-3">
                  {scenarioProfiles.map((profile) => {
                    const isSelected = profile.businessId === selectedBusinessId;
                    return (
                      <button
                        key={profile.businessId}
                        onClick={() => {
                          setSelectedBusinessId(profile.businessId);
                          setPlanResult(null);
                          setApprovalResult(null);
                          setShowDetails(false);
                          setShowProof(false);
                          setError(null);
                        }}
                        disabled={isRunLocked}
                        className={`rounded-2xl border px-4 py-3 text-left transition disabled:cursor-not-allowed ${
                          isSelected && isRunLocked
                            ? "border-emerald-300/50 bg-emerald-300/15"
                            : isSelected
                            ? "border-emerald-300/40 bg-emerald-300/10 hover:bg-emerald-300/15"
                            : isRunLocked
                            ? "border-white/10 bg-white/[0.025] opacity-35"
                            : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                              {profile.label}
                            </p>
                            <p className="mt-1 text-sm font-black text-white">
                              {profile.name}
                            </p>
                          </div>

                          {isSelected && isRunLocked ? (
                            <span className="rounded-full bg-emerald-300 px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-950">
                              Active run
                            </span>
                          ) : isSelected ? (
                            <span className="rounded-full bg-emerald-300 px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-950">
                              Selected
                            </span>
                          ) : isRunLocked ? (
                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
                              Locked
                            </span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-3 rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-3 md:grid-cols-3">
                <ProofMini
                  label="Selected"
                  value={business?.name ?? selectedScenario.name}
                  tone="green"
                />
                <ProofMini
                  label="Area"
                  value={business?.area ?? selectedScenario.area}
                />
                <ProofMini
                  label="Pressure"
                  value={scenario?.expectedPattern ?? selectedScenario.pressure}
                  tone="yellow"
                />
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
                      2 · Run agent
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-300">
                      Prepare generates the plan. Review checks it. Approve finalizes it.
                    </p>
                  </div>
                  <StatusChip tone={plan ? "yellow" : "blue"}>
                    {plan ? "Agent run active" : "Ready to start"}
                  </StatusChip>
                </div>

                <div className="mb-4">
                  <StepRail stage={stage} />
                </div>

                <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr]">
                <motion.button
                  whileHover={{ scale: plan || isGenerating ? 1 : 1.02 }}
                  whileTap={{ scale: plan || isGenerating ? 1 : 0.98 }}
                  onClick={generatePlan}
                  disabled={Boolean(plan) || isGenerating}
                  className="rounded-2xl bg-emerald-400 px-5 py-5 text-sm font-black uppercase tracking-[0.16em] text-slate-950 shadow-lg shadow-emerald-950/50 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {isGenerating
                    ? "Preparing..."
                    : plan
                    ? "1 · Prepared"
                    : "1 · Prepare"}
                </motion.button>

                <button
                  onClick={toggleReviewDetails}
                  disabled={!plan}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-5 text-sm font-black uppercase tracking-[0.16em] text-slate-200 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  {showDetails ? "Hide full plan" : "2 · Review plan"}
                </button>

                <motion.button
                  whileHover={{ scale: !plan || Boolean(finalBrief) || isApproving ? 1 : 1.02 }}
                  whileTap={{ scale: !plan || Boolean(finalBrief) || isApproving ? 1 : 0.98 }}
                  onClick={approvePlan}
                  disabled={!plan || Boolean(finalBrief) || isApproving}
                  className="rounded-2xl bg-yellow-300 px-5 py-5 text-sm font-black uppercase tracking-[0.16em] text-slate-950 shadow-lg shadow-yellow-950/50 transition hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {isApproving
                    ? "Approving..."
                    : finalBrief
                    ? "3 · Approved"
                    : "3 · Approve"}
                </motion.button>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                      3 · Current output
                    </p>
                    <p className="mt-2 text-2xl font-black text-white">
                      {topStatus}
                    </p>
                    <p className="mt-2 text-xs font-bold leading-5 text-slate-400">
                      {stage === "start"
                        ? "No run yet. Choose a profile, then click Prepare."
                        : stage === "review"
                        ? "Plan is ready. Click Review to inspect details, then Approve."
                        : "Brief is approved. Reset to test another scenario."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusChip
                      tone={
                        stage === "approved"
                          ? "green"
                          : stage === "review"
                          ? "yellow"
                          : "blue"
                      }
                    >
                      {stage === "start"
                        ? "Waiting to run"
                        : stage === "review"
                        ? "Owner approval needed"
                        : "Ready for staff"}
                    </StatusChip>
                    <button
                      onClick={resetRun}
                      disabled={!plan && !finalBrief}
                      className="rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-200 transition hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      Reset run
                    </button>
                  </div>
                </div>
              </div>

              {plan ? (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28 }}
                  className={`rounded-[1.75rem] border p-4 ${
                    finalBrief
                      ? "border-emerald-300/30 bg-emerald-300/10"
                      : "border-yellow-300/30 bg-yellow-300/10"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200">
                        {finalBrief ? "Approved output" : "Review required"}
                      </p>
                      <h3 className="mt-2 text-2xl font-black">
                        {finalBrief
                          ? "Staff briefing is ready."
                          : "Plan generated. Review it before approval."}
                      </h3>
                    </div>
                    <StatusChip tone={finalBrief ? "green" : "yellow"}>
                      {finalBrief ? "Final brief" : "Owner approval gate"}
                    </StatusChip>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <ProofMini
                      label="Staff"
                      value={finalBrief ? "Roles ready" : "Review roles"}
                      tone="green"
                    />
                    <ProofMini
                      label="Stock"
                      value={finalBrief ? "Fast movers ready" : "Review stock"}
                      tone="yellow"
                    />
                    <ProofMini
                      label="Messages"
                      value={finalBrief ? "EN / ES / FR ready" : "Review EN / ES / FR"}
                      tone="purple"
                    />
                  </div>
                </motion.div>
              ) : null}
            </div>
          </div>
        </section>

        {error ? (
          <section className="rounded-2xl border border-rose-400/30 bg-rose-950/60 p-4 text-sm font-semibold text-rose-100">
            {error}
          </section>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-[0.62fr_1.38fr]">
          <aside className="rounded-[2rem] border border-white/10 bg-[#070b17]/95 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-yellow-200">
                  Situation
                </p>
                <h2 className="mt-2 text-3xl font-black leading-tight">
                  Crowd surge risk
                </h2>
              </div>
              <StatusChip tone="yellow">High</StatusChip>
            </div>

            <p className="mt-4 text-sm font-semibold leading-7 text-slate-300">
              Quick meals, pickup demand, limited parking, multilingual
              visitors, and staff pressure near a matchday corridor.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2">
              {[
                "queues",
                "stockouts",
                "staff load",
                "visitors",
                "parking",
                "takeout",
              ].map((risk) => (
                <span
                  key={risk}
                  className="rounded-full border border-yellow-300/25 bg-yellow-300/10 px-3 py-2 text-center text-xs font-black uppercase tracking-[0.12em] text-yellow-100"
                >
                  {risk}
                </span>
              ))}
            </div>

            <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
                Safe scope
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
                No official logos, no exact crowd claims, no auto-published
                messages.
              </p>
            </div>
          </aside>

          <section className="rounded-[2rem] border border-white/10 bg-[#070b17]/95 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-300">
                  Matchday plays
                </p>
                <h2 className="mt-2 text-3xl font-black">
                  {plan
                    ? "Run these before crowds arrive."
                    : "Prepare the plan to unlock the plays."}
                </h2>
              </div>
              <StatusChip tone={plan ? "green" : "neutral"}>
                {plan ? "Ready" : "Waiting"}
              </StatusChip>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <PlayCard
                label="Staff"
                title={plan ? "Max coverage" : "Assign roles"}
                detail={plays.staff}
                icon="👥"
                tone="green"
              />
              <PlayCard
                label="Stock"
                title={plan ? "Stock fast movers" : "Prepare stock"}
                detail={plays.stock}
                icon="🥤"
                tone="yellow"
              />
              <PlayCard
                label="Flow"
                title={plan ? "Clear lanes" : "Simplify flow"}
                detail={plays.flow}
                icon="➡️"
                tone="blue"
              />
              <PlayCard
                label="Message"
                title={plan ? "Messages ready" : "Prep messages"}
                detail={plays.message}
                icon="💬"
                tone="purple"
              />
            </div>

            {showDetails && plan ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                id="review-details"
                className="scroll-mt-6 mt-5 rounded-[1.75rem] border border-white/10 bg-black/20 p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.26em] text-emerald-300">
                      Review details
                    </p>
                    <h3 className="mt-2 text-2xl font-black">
                      What to do next + customer messages
                    </h3>
                  </div>
                  <StatusChip tone="green">Gemini result</StatusChip>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                      Next 3 owner actions
                    </p>
                    <ol className="mt-3 space-y-3 text-sm font-semibold leading-6 text-slate-300">
                      {plan.ownerChecklist.slice(0, 3).map((item, index) => (
                        <li key={item}>
                          <span className="font-black text-emerald-200">
                            {index + 1}.
                          </span>{" "}
                          {cleanText(item)}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="grid gap-3">
                    <LanguageCard
                      label="English message"
                      value={cleanText(plan.customerMessages.english)}
                      tone="blue"
                    />
                    <LanguageCard
                      label="Spanish message"
                      value={cleanText(plan.customerMessages.spanish)}
                      tone="yellow"
                    />
                    <LanguageCard
                      label="French message"
                      value={cleanText(plan.customerMessages.french)}
                      tone="green"
                    />
                  </div>
                </div>
              </motion.div>
            ) : null}
          </section>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-[#070b17]/95 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-sky-300">
                Proof
              </p>
              <h2 className="mt-2 text-2xl font-black">
                MongoDB memory → Gemini plan → owner approval.
              </h2>
            </div>
            <button
              onClick={() => setShowProof((value) => !value)}
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-300 transition hover:bg-white/[0.08]"
            >
              {showProof ? "Hide proof" : "Show proof"}
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <ProofMini label="MongoDB" value="Profile + scenario + template" tone="green" />
            <ProofMini
              label="Gemini"
              value={planResult?.mode === "gemini_live" ? "Live planning" : "Ready"}
              tone="blue"
            />
            <ProofMini label="Guardrails" value="No auto-publish / no exact crowd claims" />
            <ProofMini
              label="Owner"
              value={
                finalBrief
                  ? "Approval event saved"
                  : plan
                  ? "Owner approval needed"
                  : "Waiting"
              }
              tone={finalBrief ? "green" : "yellow"}
            />
          </div>

          {showProof ? (
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              <ProofMini
                label="Decision"
                value={
                  planResult?.agentRun.decision.decisionSummary ??
                  "The agent recommends an operating posture after reviewing the scenario."
                }
                tone="blue"
              />
              <ProofMini label="Checklist" value={shortPhrase(plays.checklist)} tone="yellow" />
              <ProofMini
                label="Plan ID"
                value={planResult?.generatedPlan.planId ?? "not generated yet"}
              />
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
