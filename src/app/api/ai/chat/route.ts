import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";
import { askSustainabilityAdvisor } from "@/lib/ai/gemini";
import { calculateEmissions } from "@/lib/carbon/calculator";
import { calculateSustainabilityScore } from "@/lib/analytics/sustainabilityScore";
import { AdvisorContext } from "@/lib/ai/fallbackAdvisor";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const orgId = user?.organizationId || "demo-org-greenvalley";

    const body = await req.json();
    const { message } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    // 1. Fetch organization
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { buildings: true },
    });

    const orgName = org?.name || "Green Valley Educational Campus";

    // 2. Fetch resource totals over past 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const resourceRecords = await prisma.resourceRecord.findMany({
      where: {
        organizationId: orgId,
        recordedAt: { gte: ninetyDaysAgo },
      },
      select: {
        buildingId: true,
        resourceType: true,
        quantity: true,
      },
    });

    let totalWaterLitres = 0;
    let totalElectricityKwh = 0;
    const buildingWater: Record<string, number> = {};
    const buildingElec: Record<string, number> = {};

    for (const r of resourceRecords) {
      if (r.resourceType === "WATER") {
        totalWaterLitres += r.quantity;
        buildingWater[r.buildingId] = (buildingWater[r.buildingId] || 0) + r.quantity;
      } else if (r.resourceType === "ELECTRICITY") {
        totalElectricityKwh += r.quantity;
        buildingElec[r.buildingId] = (buildingElec[r.buildingId] || 0) + r.quantity;
      }
    }

    // 3. Waste totals
    const wasteRecords = await prisma.wasteRecord.findMany({
      where: {
        organizationId: orgId,
        recordedAt: { gte: ninetyDaysAgo },
      },
      select: {
        buildingId: true,
        wasteCategory: true,
        quantityKg: true,
        disposalMethod: true,
        recyclable: true,
      },
    });

    let totalWasteKg = 0;
    let recycledKg = 0;
    let compostKg = 0;
    let landfillKg = 0;
    let otherKg = 0;
    const buildingWaste: Record<string, number> = {};

    for (const w of wasteRecords) {
      totalWasteKg += w.quantityKg;
      buildingWaste[w.buildingId] = (buildingWaste[w.buildingId] || 0) + w.quantityKg;

      if (w.disposalMethod === "RECYCLING") recycledKg += w.quantityKg;
      else if (w.disposalMethod === "COMPOSTING") compostKg += w.quantityKg;
      else if (w.disposalMethod === "LANDFILL") landfillKg += w.quantityKg;
      else otherKg += w.quantityKg;
    }

    const wasteRecycledPct = totalWasteKg > 0 ? ((recycledKg + compostKg) / totalWasteKg) * 100 : 0;

    // 4. Carbon emissions
    const carbon = calculateEmissions(totalElectricityKwh, totalWaterLitres, {
      landfillKg,
      compostKg,
      recyclingKg: recycledKg,
      otherKg,
    });

    // 5. Sustainability score
    const totalOccupancy = org?.buildings.reduce((sum, b) => sum + (b.occupancy || 0), 0) || 1200;
    const score = calculateSustainabilityScore({
      totalElectricityKwh,
      totalWaterLitres,
      totalWasteKg,
      recycledWasteKg: recycledKg,
      compostedWasteKg: compostKg,
      totalCarbonKgCo2e: carbon.totalEmissionsKg,
      totalOccupancy,
      daysInPeriod: 90,
    });

    // 6. Active anomalies
    const anomalies = await prisma.anomaly.findMany({
      where: {
        organizationId: orgId,
        status: { in: ["OPEN", "INVESTIGATING"] },
      },
      include: { building: true },
      take: 5,
    });

    // 7. Top recommendations
    const recommendations = await prisma.recommendation.findMany({
      where: {
        organizationId: orgId,
        status: { in: ["PROPOSED", "ACCEPTED", "IN_PROGRESS"] },
      },
      take: 5,
    });

    const buildingStats = (org?.buildings || []).map((b) => ({
      name: b.name,
      code: b.code,
      waterLitres: Math.round(buildingWater[b.id] || 0),
      electricityKwh: Math.round(buildingElec[b.id] || 0),
      wasteKg: Math.round(buildingWaste[b.id] || 0),
      areaSqFt: b.areaSqFt,
      occupancy: b.occupancy,
    }));

    const context: AdvisorContext = {
      organizationName: orgName,
      reportingPeriod: "Past 90 Days",
      totalWaterLitres: Math.round(totalWaterLitres),
      totalElectricityKwh: Math.round(totalElectricityKwh),
      totalWasteKg: Math.round(totalWasteKg),
      wasteRecycledPct,
      totalCarbonKgCo2e: carbon.totalEmissionsKg,
      sustainabilityScore: score.overallScore,
      sustainabilityGrade: score.letterGrade,
      buildingStats,
      activeAnomalies: anomalies.map((a) => ({
        buildingName: a.building.name,
        resourceType: a.resourceType,
        severity: a.severity,
        deviationPct: a.deviationPct,
        explanation: a.explanation,
      })),
      topRecommendations: recommendations.map((r) => ({
        title: r.title,
        category: r.category,
        priority: r.priority,
        evidence: r.evidence,
      })),
    };

    const response = await askSustainabilityAdvisor(message, context);
    return NextResponse.json(response);
  } catch (error) {
    console.error("AI Advisor API error:", error);
    return NextResponse.json(
      { error: "Failed to generate AI response." },
      { status: 500 }
    );
  }
}
