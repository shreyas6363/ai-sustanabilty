import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";
import { runWhatIfSimulation, BaselineData } from "@/lib/analytics/whatIfSimulator";
import { z } from "zod";

const simulationSchema = z.object({
  electricityReductionPct: z.number().min(0).max(100),
  waterReductionPct: z.number().min(0).max(100),
  recyclingIncreasePct: z.number().min(0).max(100),
  buildingId: z.string().optional(),
  days: z.number().default(90),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const orgId = user?.organizationId || "demo-org-greenvalley";

    const body = await req.json();
    const parsed = simulationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const {
      electricityReductionPct,
      waterReductionPct,
      recyclingIncreasePct,
      buildingId,
      days,
    } = parsed.data;

    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - days);

    const whereResource: Record<string, unknown> = {
      organizationId: orgId,
      recordedAt: { gte: periodStart },
    };
    if (buildingId && buildingId !== "ALL") whereResource.buildingId = buildingId;

    const resources = await prisma.resourceRecord.findMany({ where: whereResource });

    let electricityKwh = 0;
    let waterLitres = 0;
    for (const r of resources) {
      if (r.resourceType === "ELECTRICITY") electricityKwh += r.quantity;
      else if (r.resourceType === "WATER") waterLitres += r.quantity;
    }

    const whereWaste: Record<string, unknown> = {
      organizationId: orgId,
      recordedAt: { gte: periodStart },
    };
    if (buildingId && buildingId !== "ALL") whereWaste.buildingId = buildingId;

    const wastes = await prisma.wasteRecord.findMany({ where: whereWaste });

    let wasteTotalKg = 0;
    let wasteRecycledKg = 0;
    let wasteCompostedKg = 0;
    let wasteLandfillKg = 0;
    let wasteOtherKg = 0;

    for (const w of wastes) {
      wasteTotalKg += w.quantityKg;
      if (w.disposalMethod === "RECYCLING") wasteRecycledKg += w.quantityKg;
      else if (w.disposalMethod === "COMPOSTING") wasteCompostedKg += w.quantityKg;
      else if (w.disposalMethod === "LANDFILL") wasteLandfillKg += w.quantityKg;
      else wasteOtherKg += w.quantityKg;
    }

    const baseline: BaselineData = {
      electricityKwh,
      waterLitres,
      wasteTotalKg,
      wasteRecycledKg,
      wasteCompostedKg,
      wasteLandfillKg,
      wasteOtherKg,
      electricityTariffPerKwh: 0.14,
      waterTariffPerThousandL: 2.5,
    };

    const simulation = runWhatIfSimulation(baseline, {
      electricityReductionPct,
      waterReductionPct,
      recyclingIncreasePct,
    });

    return NextResponse.json({
      success: true,
      baseline,
      simulation,
      disclaimer:
        "SIMULATION MODEL: All projected reductions and cost impacts are hypothetical mathematical simulations based on past baseline consumption and current tariff assumptions. These are not realized savings.",
    });
  } catch (error) {
    console.error("Simulation error:", error);
    return NextResponse.json({ error: "Failed to run simulation." }, { status: 500 });
  }
}
