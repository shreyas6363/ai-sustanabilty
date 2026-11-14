import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";
import { calculateEmissions } from "@/lib/carbon/calculator";
import { calculateSustainabilityScore } from "@/lib/analytics/sustainabilityScore";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const orgId = user?.organizationId || "demo-org-greenvalley";

    const { searchParams } = new URL(req.url);
    const buildingFilter = searchParams.get("buildingId");
    const daysParam = parseInt(searchParams.get("days") || "90", 10);

    const now = new Date();
    const currentPeriodStart = new Date(now);
    currentPeriodStart.setDate(currentPeriodStart.getDate() - daysParam);

    const previousPeriodStart = new Date(currentPeriodStart);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - daysParam);

    // 1. Fetch organization and buildings
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { buildings: true },
    });

    const buildings = org?.buildings || [];
    const buildingMap = new Map(buildings.map((b) => [b.id, b]));

    // 2. Resource records for current and previous periods
    const whereBase: Record<string, unknown> = {
      organizationId: orgId,
    };
    if (buildingFilter && buildingFilter !== "ALL") {
      whereBase.buildingId = buildingFilter;
    }

    const currentResource = await prisma.resourceRecord.findMany({
      where: {
        ...whereBase,
        recordedAt: { gte: currentPeriodStart, lte: now },
      },
      orderBy: { recordedAt: "asc" },
    });

    const previousResource = await prisma.resourceRecord.findMany({
      where: {
        ...whereBase,
        recordedAt: { gte: previousPeriodStart, lt: currentPeriodStart },
      },
    });

    // 3. Waste records for current and previous periods
    const currentWaste = await prisma.wasteRecord.findMany({
      where: {
        ...whereBase,
        recordedAt: { gte: currentPeriodStart, lte: now },
      },
      orderBy: { recordedAt: "asc" },
    });

    const previousWaste = await prisma.wasteRecord.findMany({
      where: {
        ...whereBase,
        recordedAt: { gte: previousPeriodStart, lt: currentPeriodStart },
      },
    });

    // Aggregate Current Period Water & Electricity
    let currentWater = 0;
    let currentElec = 0;
    const buildingWater: Record<string, number> = {};
    const buildingElec: Record<string, number> = {};
    const timeSeriesMap: Record<
      string,
      { date: string; water: number; electricity: number; waste: number; carbon: number }
    > = {};

    for (const r of currentResource) {
      const dayStr = r.recordedAt.toISOString().split("T")[0];
      if (!timeSeriesMap[dayStr]) {
        timeSeriesMap[dayStr] = { date: dayStr, water: 0, electricity: 0, waste: 0, carbon: 0 };
      }

      if (r.resourceType === "WATER") {
        currentWater += r.quantity;
        buildingWater[r.buildingId] = (buildingWater[r.buildingId] || 0) + r.quantity;
        timeSeriesMap[dayStr].water += r.quantity;
      } else if (r.resourceType === "ELECTRICITY") {
        currentElec += r.quantity;
        buildingElec[r.buildingId] = (buildingElec[r.buildingId] || 0) + r.quantity;
        timeSeriesMap[dayStr].electricity += r.quantity;
      }
    }

    // Previous Period Water & Electricity
    let previousWater = 0;
    let previousElec = 0;
    for (const r of previousResource) {
      if (r.resourceType === "WATER") previousWater += r.quantity;
      else if (r.resourceType === "ELECTRICITY") previousElec += r.quantity;
    }

    // Aggregate Waste
    let currentWasteTotal = 0;
    let currentRecycled = 0;
    let currentCompost = 0;
    let currentLandfill = 0;
    let currentOther = 0;
    const buildingWaste: Record<string, number> = {};
    const wasteByCategory: Record<string, number> = {};

    for (const w of currentWaste) {
      const dayStr = w.recordedAt.toISOString().split("T")[0];
      if (!timeSeriesMap[dayStr]) {
        timeSeriesMap[dayStr] = { date: dayStr, water: 0, electricity: 0, waste: 0, carbon: 0 };
      }
      timeSeriesMap[dayStr].waste += w.quantityKg;

      currentWasteTotal += w.quantityKg;
      buildingWaste[w.buildingId] = (buildingWaste[w.buildingId] || 0) + w.quantityKg;
      wasteByCategory[w.wasteCategory] = (wasteByCategory[w.wasteCategory] || 0) + w.quantityKg;

      if (w.disposalMethod === "RECYCLING") currentRecycled += w.quantityKg;
      else if (w.disposalMethod === "COMPOSTING") currentCompost += w.quantityKg;
      else if (w.disposalMethod === "LANDFILL") currentLandfill += w.quantityKg;
      else currentOther += w.quantityKg;
    }

    let previousWasteTotal = 0;
    let previousRecycled = 0;
    let previousCompost = 0;
    let previousLandfill = 0;
    let previousOther = 0;
    for (const w of previousWaste) {
      previousWasteTotal += w.quantityKg;
      if (w.disposalMethod === "RECYCLING") previousRecycled += w.quantityKg;
      else if (w.disposalMethod === "COMPOSTING") previousCompost += w.quantityKg;
      else if (w.disposalMethod === "LANDFILL") previousLandfill += w.quantityKg;
      else previousOther += w.quantityKg;
    }

    // Carbon Calculations
    const currentCarbon = calculateEmissions(currentElec, currentWater, {
      landfillKg: currentLandfill,
      compostKg: currentCompost,
      recyclingKg: currentRecycled,
      otherKg: currentOther,
    });

    const previousCarbon = calculateEmissions(previousElec, previousWater, {
      landfillKg: previousLandfill,
      compostKg: previousCompost,
      recyclingKg: previousRecycled,
      otherKg: previousOther,
    });

    // Populate daily carbon in time series
    for (const day in timeSeriesMap) {
      const pt = timeSeriesMap[day];
      // Approx daily carbon
      pt.carbon = Number((pt.electricity * 0.42 + pt.water * 0.00035 + pt.waste * 0.35).toFixed(1));
    }

    // % changes
    const calcChange = (cur: number, prev: number) => {
      if (prev === 0) return 0;
      return Number((((cur - prev) / prev) * 100).toFixed(1));
    };

    const waterChangePct = calcChange(currentWater, previousWater);
    const elecChangePct = calcChange(currentElec, previousElec);
    const wasteChangePct = calcChange(currentWasteTotal, previousWasteTotal);
    const carbonChangePct = calcChange(currentCarbon.totalEmissionsKg, previousCarbon.totalEmissionsKg);

    // Sustainability score
    const targetOccupancy =
      buildingFilter && buildingFilter !== "ALL"
        ? buildingMap.get(buildingFilter)?.occupancy || 500
        : buildings.reduce((s, b) => s + (b.occupancy || 0), 0) || 1200;

    const sustainabilityScore = calculateSustainabilityScore({
      totalElectricityKwh: currentElec,
      totalWaterLitres: currentWater,
      totalWasteKg: currentWasteTotal,
      recycledWasteKg: currentRecycled,
      compostedWasteKg: currentCompost,
      totalCarbonKgCo2e: currentCarbon.totalEmissionsKg,
      totalOccupancy: targetOccupancy,
      daysInPeriod: daysParam,
    });

    // Building Rankings
    const topBuildings = buildings.map((b) => ({
      id: b.id,
      name: b.name,
      code: b.code,
      waterLitres: Math.round(buildingWater[b.id] || 0),
      electricityKwh: Math.round(buildingElec[b.id] || 0),
      wasteKg: Math.round(buildingWaste[b.id] || 0),
      areaSqFt: b.areaSqFt,
      occupancy: b.occupancy,
    }));

    // Active Anomalies & Recommendations counts
    const openAnomaliesCount = await prisma.anomaly.count({
      where: {
        organizationId: orgId,
        status: { in: ["OPEN", "INVESTIGATING"] },
      },
    });

    const activeRecommendationsCount = await prisma.recommendation.count({
      where: {
        organizationId: orgId,
        status: { in: ["PROPOSED", "ACCEPTED", "IN_PROGRESS"] },
      },
    });

    const timeSeries = Object.values(timeSeriesMap).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    return NextResponse.json({
      organization: {
        id: org?.id,
        name: org?.name,
      },
      kpis: {
        water: {
          totalLitres: Math.round(currentWater),
          dailyAverageLitres: Math.round(currentWater / daysParam),
          changePct: waterChangePct,
          previousPeriodLitres: Math.round(previousWater),
        },
        energy: {
          totalKwh: Math.round(currentElec),
          dailyAverageKwh: Math.round(currentElec / daysParam),
          changePct: elecChangePct,
          previousPeriodKwh: Math.round(previousElec),
        },
        waste: {
          totalKg: Math.round(currentWasteTotal),
          recycledKg: Math.round(currentRecycled),
          compostKg: Math.round(currentCompost),
          landfillKg: Math.round(currentLandfill),
          recyclingRatePct: currentWasteTotal > 0 ? Number((((currentRecycled + currentCompost) / currentWasteTotal) * 100).toFixed(1)) : 0,
          changePct: wasteChangePct,
        },
        carbon: {
          totalKgCo2e: currentCarbon.totalEmissionsKg,
          totalMetricTonnes: currentCarbon.totalEmissionsMetricTonnes,
          scope2Kg: currentCarbon.scopeBreakdown.scope2Kg,
          scope3Kg: currentCarbon.scopeBreakdown.scope3Kg,
          changePct: carbonChangePct,
          disclaimer: currentCarbon.disclaimer,
        },
        sustainabilityScore,
      },
      timeSeries,
      wasteComposition: Object.entries(wasteByCategory).map(([name, value]) => ({
        name,
        value: Math.round(value),
      })),
      topBuildings,
      openAnomaliesCount,
      activeRecommendationsCount,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard metrics." },
      { status: 500 }
    );
  }
}
