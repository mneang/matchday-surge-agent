import { NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";
import { MatchdayPlan } from "@/lib/types";

type GeneratedPlanDocument = {
  planId: string;
  businessId: string;
  scenarioId: string;
  status: "pending_owner_approval" | "approved";
  mode: "gemini_live" | "deterministic_fallback";
  matchdayPlan: MatchdayPlan;
  createdAt: string;
};

function buildFinalBrief(plan: GeneratedPlanDocument) {
  return {
    title: "Owner-Approved Matchday Surge Brief",
    planId: plan.planId,
    status: "approved",
    summary: plan.matchdayPlan.summary,
    sections: {
      staffing: plan.matchdayPlan.staffing,
      inventory: plan.matchdayPlan.inventory,
      serviceFlow: plan.matchdayPlan.serviceFlow,
      customerMessages: plan.matchdayPlan.customerMessages,
      riskNotes: plan.matchdayPlan.riskNotes,
      ownerChecklist: plan.matchdayPlan.ownerChecklist,
    },
    approvalNote:
      "This matchday surge plan has been reviewed and approved by the business owner for staff briefing and customer-facing preparation.",
  };
}

export async function POST(request: Request) {
  try {
    const db = await getMongoDb();

    let requestedPlanId: string | null = null;
    let requestedBusinessId: string | null = null;

    try {
      const body = await request.json();
      requestedPlanId =
        typeof body?.planId === "string" && body.planId.trim()
          ? body.planId
          : null;
      requestedBusinessId =
        typeof body?.businessId === "string" && body.businessId.trim()
          ? body.businessId
          : null;
    } catch {
      // No JSON body provided. Approve latest pending plan.
    }

    const planFilter: Record<string, string> = {
      status: "pending_owner_approval",
    };

    if (requestedPlanId) {
      planFilter.planId = requestedPlanId;
    } else if (requestedBusinessId) {
      planFilter.businessId = requestedBusinessId;
    }

    const latestPlan = (await db
      .collection("generated_plans")
      .find(planFilter)
      .sort({ createdAt: -1 })
      .limit(1)
      .next()) as GeneratedPlanDocument | null;

    if (!latestPlan) {
      return NextResponse.json(
        {
          ok: false,
          source: "mongodb",
          error:
            "No pending matchday surge plan found. Run POST /api/agent/generate-plan first.",
        },
        { status: 404 }
      );
    }

    const approvedAt = new Date().toISOString();

    await db.collection("generated_plans").updateOne(
      { planId: latestPlan.planId },
      {
        $set: {
          status: "approved",
          approvedAt,
        },
      }
    );

    const approvalEvent = {
      approvalId: `approval_${latestPlan.planId}_${Date.now()}`,
      planId: latestPlan.planId,
      businessId: latestPlan.businessId,
      scenarioId: latestPlan.scenarioId,
      approvedBy: "business_owner",
      status: "approved",
      approvedAt,
      note: "Owner approved the matchday surge plan for operational use.",
    };

    await db.collection("approval_events").insertOne(approvalEvent);

    const finalBrief = buildFinalBrief({
      ...latestPlan,
      status: "approved",
    });

    return NextResponse.json({
      ok: true,
      source: "mongodb",
      approvalEvent: {
        approvalId: approvalEvent.approvalId,
        planId: approvalEvent.planId,
        approvedBy: approvalEvent.approvedBy,
        status: approvalEvent.status,
        approvedAt: approvalEvent.approvedAt,
      },
      finalBrief,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        source: "mongodb",
        error:
          error instanceof Error
            ? error.message
            : "Unknown approval finalization error",
      },
      { status: 500 }
    );
  }
}
