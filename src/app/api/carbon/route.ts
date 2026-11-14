import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";
import { calculateEmissions, DEFAULT_EMISSION_FACTORS } from "@/lib/carbon/calculator";
import { canManageSettings } from "@/lib/auth/roles";
import { z } from "zod";

const updateFactorSchema = z.object({
  resourceType: z.string().min(1),
  factorValue: z.number().positive("Factor value must be positive"),
  factorUnit: z.string().min(1),
  source: z.string().min(3, "Citation source is required"),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const orgId = user?.organizationId || "demo-org-greenvalley";

    const { searchParams } = new URL(req.url);
    const buildingId = searchParams.get("buildingId");
    const daysParam = parseInt(searchParams.get("days") || "90", 10);

    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - daysParam);

    // 1. Fetch custom emission factors from database
    const dbFactors = await prisma.emissionFactor.findMany({
      where: { organizationId: orgId },
    });

    const factorLookup: Record<string, number> = {};
    for (const f of dbFactors) {
      factorLookup[f.resourceType] = f.factorValue;
    }

    // 2. Fetch resources
    const whereResource: Record<string, unknown> = {
      organizationId: orgId,
      recordedAt: { gte: periodStart },
    };
    if (buildingId && buildingId !== "ALL") whereResource.buildingId = buildingId;

    const resources = await prisma.resourceRecord.findMany({
      where: whereResource,
      include: { building: true },
    });

    // 3. Fetch waste
    const whereWaste: Record<string, unknown> = {
      organizationId: orgId,
      recordedAt: { gte: periodStart },
    };
    if (buildingId && buildingId !== "ALL") whereWaste.buildingId = buildingId;

    const wastes = await prisma.wasteRecord.findMany({
      where: whereWaste,
      include: { building: true },
    });

    let totalElecKwh = 0;
    let totalWaterL = 0;
    const buildingElec: Record<string, number> = {};
    const buildingWater: Record<string, number> = {};
    const monthlySeriesMap: Record<string, { month: string; electricity: number; water: number; waste: number }> = {};

    for (const r of resources) {
      const monthStr = r.recordedAt.toISOString().slice(0, 7); // YYYY-MM
      if (!monthlySeriesMap[monthStr]) {
        monthlySeriesMap[monthStr] = { month: monthStr, electricity: 0, water: 0, waste: 0 };
      }

      if (r.resourceType === "ELECTRICITY") {
        totalElecKwh += r.quantity;
        buildingElec[r.buildingId] = (buildingElec[r.buildingId] || 0) + r.quantity;
        monthlySeriesMap[monthStr].electricity += r.quantity;
      } else if (r.resourceType === "WATER") {
        totalWaterL += r.quantity;
        buildingWater[r.buildingId] = (buildingWater[r.buildingId] || 0) + r.quantity;
        monthlySeriesMap[monthStr].water += r.quantity;
      }
    }

    let landfillKg = 0;
    let compostKg = 0;
    let recyclingKg = 0;
    let otherKg = 0;
    const buildingWasteKg: Record<string, number> = {};

    for (const w of wastes) {
      const monthStr = w.recordedAt.toISOString().slice(0, 7);
      if (!monthlySeriesMap[monthStr]) {
        monthlySeriesMap[monthStr] = { month: monthStr, electricity: 0, water: 0, waste: 0 };
      }
      monthlySeriesMap[monthStr].waste += w.quantityKg;

      buildingWasteKg[w.buildingId] = (buildingWasteKg[w.buildingId] || 0) + w.quantityKg;

      if (w.disposalMethod === "RECYCLING") recyclingKg += w.quantityKg;
      else if (w.disposalMethod === "COMPOSTING") compostKg += w.quantityKg;
      else if (w.disposalMethod === "LANDFILL") landfillKg += w.quantityKg;
      else otherKg += w.quantityKg;
    }

    // 4. Calculate total emissions
    const emissions = calculateEmissions(
      totalElecKwh,
      totalWaterL,
      { landfillKg, compostKg, recyclingKg, otherKg },
      factorLookup
    );

    // 5. Source Contribution
    const sources = [
      { name: "Electricity (Scope 2)", emissionsKg: emissions.electricityEmissionsKg, color: "#10b981" },
      { name: "Municipal Water Distribution (Scope 3)", emissionsKg: emissions.waterEmissionsKg, color: "#06b6d4" },
      { name: "Waste Lifecycle & Disposal (Scope 3)", emissionsKg: emissions.wasteEmissionsKg, color: "#f59e0b" },
    ];

    // 6. Monthly series with computed emissions
    const monthlyEmissions = Object.values(monthlySeriesMap)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((m) => {
        const monthCalc = calculateEmissions(
          m.electricity,
          m.water,
          { landfillKg: m.waste * 0.4, compostKg: m.waste * 0.3, recyclingKg: m.waste * 0.3, otherKg: 0 },
          factorLookup
        );
        return {
          month: m.month,
          totalKgCo2e: monthCalc.totalEmissionsKg,
          electricityKgCo2e: monthCalc.electricityEmissionsKg,
          waterKgCo2e: monthCalc.waterEmissionsKg,
          wasteKgCo2e: monthCalc.wasteEmissionsKg,
        };
      });

    // 7. Building Breakdown
    const allBuildings = await prisma.building.findMany({
      where: { organizationId: orgId },
    });

    const buildingEmissions = allBuildings.map((b) => {
      const elec = buildingElec[b.id] || 0;
      const water = buildingWater[b.id] || 0;
      const waste = buildingWasteKg[b.id] || 0;

      const calc = calculateEmissions(
        elec,
        water,
        { landfillKg: waste * 0.4, compostKg: waste * 0.3, recyclingKg: waste * 0.3, otherKg: 0 },
        factorLookup
      );

      return {
        id: b.id,
        name: b.name,
        code: b.code,
        totalEmissionsKg: calc.totalEmissionsKg,
        electricityEmissionsKg: calc.electricityEmissionsKg,
        waterEmissionsKg: calc.waterEmissionsKg,
        wasteEmissionsKg: calc.wasteEmissionsKg,
        areaSqFt: b.areaSqFt,
        emissionsIntensityKgPerSqFt: b.areaSqFt ? Number((calc.totalEmissionsKg / b.areaSqFt).toFixed(3)) : null,
      };
    });

    return NextResponse.json({
      summary: emissions,
      sources,
      monthlyEmissions,
      buildingEmissions,
      emissionFactors: dbFactors,
    });
  } catch (error) {
    console.error("Carbon API error:", error);
    return NextResponse.json({ error: "Failed to calculate carbon emissions." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !canManageSettings(user.role)) {
      return NextResponse.json({ error: "Unauthorized. Administrator rights required." }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateFactorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { resourceType, factorValue, factorUnit, source } = parsed.data;

    const factor = await prisma.emissionFactor.upsert({
      where: {
        organizationId_resourceType: {
          organizationId: user.organizationId,
          resourceType,
        },
      },
      update: { factorValue, factorUnit, source },
      create: {
        organizationId: user.organizationId,
        resourceType,
        factorValue,
        factorUnit,
        source,
        isDefault: false,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: "UPDATE",
        entityType: "EMISSION_FACTOR",
        entityId: factor.id,
        details: `Updated ${resourceType} emission factor to ${factorValue} ${factorUnit} (${source})`,
      },
    });

    return NextResponse.json({ success: true, factor });
  } catch (error) {
    console.error("Update emission factor error:", error);
    return NextResponse.json({ error: "Failed to update emission factor." }, { status: 500 });
  }
}
