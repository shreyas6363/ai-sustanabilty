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
    const daysParam = parseInt(searchParams.get("days") || "90", 10);

    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setDate(periodStart.getDate() - daysParam);

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { buildings: true },
    });

    // 1. Resources
    const resources = await prisma.resourceRecord.findMany({
      where: { organizationId: orgId, recordedAt: { gte: periodStart } },
      include: { building: true },
    });

    let totalWaterL = 0;
    let totalElecKwh = 0;
    const buildingWater: Record<string, number> = {};
    const buildingElec: Record<string, number> = {};

    for (const r of resources) {
      if (r.resourceType === "WATER") {
        totalWaterL += r.quantity;
        buildingWater[r.building.name] = (buildingWater[r.building.name] || 0) + r.quantity;
      } else if (r.resourceType === "ELECTRICITY") {
        totalElecKwh += r.quantity;
        buildingElec[r.building.name] = (buildingElec[r.building.name] || 0) + r.quantity;
      }
    }

    // 2. Waste
    const wastes = await prisma.wasteRecord.findMany({
      where: { organizationId: orgId, recordedAt: { gte: periodStart } },
    });

    let totalWasteKg = 0;
    let recycledKg = 0;
    let compostKg = 0;
    let landfillKg = 0;
    let otherKg = 0;

    for (const w of wastes) {
      totalWasteKg += w.quantityKg;
      if (w.disposalMethod === "RECYCLING") recycledKg += w.quantityKg;
      else if (w.disposalMethod === "COMPOSTING") compostKg += w.quantityKg;
      else if (w.disposalMethod === "LANDFILL") landfillKg += w.quantityKg;
      else otherKg += w.quantityKg;
    }

    // 3. Carbon
    const carbon = calculateEmissions(totalElecKwh, totalWaterL, {
      landfillKg,
      compostKg,
      recyclingKg,
      otherKg,
    });

    // 4. Score
    const totalOccupancy = org?.buildings.reduce((sum, b) => sum + (b.occupancy || 0), 0) || 1200;
    const score = calculateSustainabilityScore({
      totalElectricityKwh: totalElecKwh,
      totalWaterLitres: totalWaterL,
      totalWasteKg,
      recycledWasteKg: recycledKg,
      compostedWasteKg: compostKg,
      totalCarbonKgCo2e: carbon.totalEmissionsKg,
      totalOccupancy,
      daysInPeriod: daysParam,
    });

    // 5. Anomalies & Recommendations
    const anomalies = await prisma.anomaly.findMany({
      where: { organizationId: orgId },
      include: { building: true },
      take: 10,
    });

    const recommendations = await prisma.recommendation.findMany({
      where: { organizationId: orgId },
      include: { building: true },
      take: 10,
    });

    return NextResponse.json({
      organization: {
        name: org?.name || "Green Valley Educational Campus",
        type: org?.organizationType,
        location: org?.location,
      },
      reportMetadata: {
        generatedAt: new Date().toISOString(),
        generatedBy: user?.name || "Automated Sustainability Intelligence Suite",
        reportingPeriod: `Past ${daysParam} Days (${periodStart.toISOString().split("T")[0]} to ${now.toISOString().split("T")[0]})`,
      },
      kpis: {
        water: {
          totalLitres: Math.round(totalWaterL),
          dailyAverageLitres: Math.round(totalWaterL / daysParam),
        },
        electricity: {
          totalKwh: Math.round(totalElecKwh),
          dailyAverageKwh: Math.round(totalElecKwh / daysParam),
        },
        waste: {
          totalKg: Math.round(totalWasteKg),
          recycledKg: Math.round(recycledKg),
          compostKg: Math.round(compostKg),
          landfillKg: Math.round(landfillKg),
          diversionRatePct: totalWasteKg > 0 ? Number((((recycledKg + compostKg) / totalWasteKg) * 100).toFixed(1)) : 0,
        },
        carbon: {
          totalKgCo2e: carbon.totalEmissionsKg,
          totalMetricTonnes: carbon.totalEmissionsMetricTonnes,
          scope2Kg: carbon.scopeBreakdown.scope2Kg,
          scope3Kg: carbon.scopeBreakdown.scope3Kg,
        },
        sustainabilityScore: score,
      },
      buildingWater,
      buildingElec,
      anomalies,
      recommendations,
      methodologyNotes: [
        "Electricity emissions calculated using standard illustrative regional factor of 0.42 kg CO2e/kWh.",
        "Municipal water distribution and treatment emissions factor: 0.00035 kg CO2e/Litre.",
        "Waste emissions use IPCC and EPA WARM landfill anaerobic decomposition factors.",
        "Sustainability score is mathematically computed across 4 pillars: Water (30%), Energy (35%), Waste (20%), and Carbon (15%).",
      ],
    });
  } catch (error) {
    console.error("Reports API error:", error);
    return NextResponse.json({ error: "Failed to generate report." }, { status: 500 });
  }
}
