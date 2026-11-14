import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";
import { canManageSettings } from "@/lib/auth/roles";
import { z } from "zod";

const buildingSchema = z.object({
  name: z.string().min(2, "Building name is required"),
  code: z.string().min(2, "Building code is required"),
  location: z.string().min(2, "Location is required"),
  areaSqFt: z.number().positive().optional().nullable(),
  occupancy: z.number().int().positive().optional().nullable(),
  operatingSchedule: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "RENOVATION"]).default("ACTIVE"),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    const orgId = user?.organizationId || "demo-org-greenvalley";

    const buildings = await prisma.building.findMany({
      where: { organizationId: orgId },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            resourceRecords: true,
            wasteRecords: true,
            anomalies: true,
            devices: true,
          },
        },
      },
    });

    // 90-day aggregation for each building
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

    const wasteRecords = await prisma.wasteRecord.findMany({
      where: {
        organizationId: orgId,
        recordedAt: { gte: ninetyDaysAgo },
      },
      select: {
        buildingId: true,
        quantityKg: true,
        disposalMethod: true,
      },
    });

    const buildingAggregates: Record<
      string,
      { waterLitres: number; electricityKwh: number; wasteKg: number; recycledKg: number }
    > = {};

    for (const b of buildings) {
      buildingAggregates[b.id] = { waterLitres: 0, electricityKwh: 0, wasteKg: 0, recycledKg: 0 };
    }

    for (const r of resourceRecords) {
      if (!buildingAggregates[r.buildingId]) continue;
      if (r.resourceType === "WATER") buildingAggregates[r.buildingId].waterLitres += r.quantity;
      else if (r.resourceType === "ELECTRICITY") buildingAggregates[r.buildingId].electricityKwh += r.quantity;
    }

    for (const w of wasteRecords) {
      if (!buildingAggregates[w.buildingId]) continue;
      buildingAggregates[w.buildingId].wasteKg += w.quantityKg;
      if (w.disposalMethod === "RECYCLING" || w.disposalMethod === "COMPOSTING") {
        buildingAggregates[w.buildingId].recycledKg += w.quantityKg;
      }
    }

    const enhancedBuildings = buildings.map((b) => {
      const agg = buildingAggregates[b.id] || { waterLitres: 0, electricityKwh: 0, wasteKg: 0, recycledKg: 0 };
      const energyIntensityKwhPerSqFt = b.areaSqFt && b.areaSqFt > 0 ? Number((agg.electricityKwh / b.areaSqFt).toFixed(2)) : null;
      const waterPerCapitaL = b.occupancy && b.occupancy > 0 ? Number((agg.waterLitres / b.occupancy).toFixed(1)) : null;
      const recyclingRatePct = agg.wasteKg > 0 ? Number(((agg.recycledKg / agg.wasteKg) * 100).toFixed(1)) : 0;

      return {
        ...b,
        metrics90Days: {
          waterLitres: Math.round(agg.waterLitres),
          electricityKwh: Math.round(agg.electricityKwh),
          wasteKg: Math.round(agg.wasteKg),
          recycledKg: Math.round(agg.recycledKg),
          recyclingRatePct,
          energyIntensityKwhPerSqFt,
          waterPerCapitaL,
          isAreaMissing: !b.areaSqFt,
          isOccupancyMissing: !b.occupancy,
        },
      };
    });

    return NextResponse.json({ buildings: enhancedBuildings });
  } catch (error) {
    console.error("Buildings API error:", error);
    return NextResponse.json({ error: "Failed to load buildings." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !canManageSettings(user.role)) {
      return NextResponse.json({ error: "Unauthorized. Admin rights required." }, { status: 403 });
    }

    const body = await req.json();
    const parsed = buildingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { name, code, location, areaSqFt, occupancy, operatingSchedule, status } = parsed.data;

    const existing = await prisma.building.findFirst({
      where: { organizationId: user.organizationId, code: code.trim().toUpperCase() },
    });

    if (existing) {
      return NextResponse.json({ error: "A building with this code already exists." }, { status: 400 });
    }

    const building = await prisma.building.create({
      data: {
        organizationId: user.organizationId,
        name,
        code: code.trim().toUpperCase(),
        location,
        areaSqFt,
        occupancy,
        operatingSchedule,
        status,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: "CREATE",
        entityType: "BUILDING",
        entityId: building.id,
        details: `Created building: ${building.name} (${building.code})`,
      },
    });

    return NextResponse.json({ success: true, building });
  } catch (error) {
    console.error("Create building error:", error);
    return NextResponse.json({ error: "Failed to create building." }, { status: 500 });
  }
}
