import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";
import { generate7DayForecast } from "@/lib/forecasting/engine";
import { detectResourceAnomalies } from "@/lib/anomalies/detector";
import { canWriteResourceData } from "@/lib/auth/roles";
import { z } from "zod";

const createWaterSchema = z.object({
  buildingId: z.string().min(1, "Building is required"),
  quantity: z.number().positive("Quantity must be positive"),
  recordedAt: z.string().min(1, "Date is required"),
  category: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const orgId = user?.organizationId || "demo-org-greenvalley";

    const { searchParams } = new URL(req.url);
    const buildingId = searchParams.get("buildingId");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const daysParam = parseInt(searchParams.get("days") || "90", 10);

    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - daysParam);

    const where: Record<string, unknown> = {
      organizationId: orgId,
      resourceType: "WATER",
      recordedAt: { gte: periodStart },
    };

    if (buildingId && buildingId !== "ALL") {
      where.buildingId = buildingId;
    }

    // 1. Fetch raw water records
    const records = await prisma.resourceRecord.findMany({
      where,
      orderBy: { recordedAt: "desc" },
      include: { building: true },
      take: limit,
    });

    // 2. Fetch full historical series for analytics & forecast
    const fullSeries = await prisma.resourceRecord.findMany({
      where,
      orderBy: { recordedAt: "asc" },
      include: { building: true },
    });

    // Compute daily aggregated series
    const dailyMap: Record<string, { date: string; value: number }> = {};
    const buildingMap: Record<string, { name: string; code: string; totalLitres: number }> = {};
    let totalWaterLitres = 0;

    for (const r of fullSeries) {
      totalWaterLitres += r.quantity;
      const d = r.recordedAt.toISOString().split("T")[0];
      if (!dailyMap[d]) dailyMap[d] = { date: d, value: 0 };
      dailyMap[d].value += r.quantity;

      if (!buildingMap[r.buildingId]) {
        buildingMap[r.buildingId] = {
          name: r.building.name,
          code: r.building.code,
          totalLitres: 0,
        };
      }
      buildingMap[r.buildingId].totalLitres += r.quantity;
    }

    const timeSeries = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    // 3. Generate 7-day forecast
    const forecastInput = timeSeries.map((t) => ({
      date: new Date(t.date),
      value: t.value,
    }));
    const forecast = generate7DayForecast(forecastInput, "WATER", "L");

    // 4. Run real-time anomaly detection
    const anomalyDataPoints = fullSeries.map((r) => ({
      id: r.id,
      date: r.recordedAt,
      value: r.quantity,
      buildingId: r.buildingId,
      buildingName: r.building.name,
      resourceType: "WATER" as const,
      operatingSchedule: r.building.operatingSchedule,
    }));
    const detectedAnomalies = detectResourceAnomalies(anomalyDataPoints, 7);

    return NextResponse.json({
      summary: {
        totalLitres: Math.round(totalWaterLitres),
        dailyAverageLitres: Math.round(totalWaterLitres / Math.max(1, timeSeries.length)),
        daysRecorded: timeSeries.length,
      },
      timeSeries,
      buildingBreakdown: Object.values(buildingMap),
      forecast,
      detectedAnomalies: detectedAnomalies.slice(-5), // return most recent
      records,
    });
  } catch (error) {
    console.error("Water API error:", error);
    return NextResponse.json({ error: "Failed to load water data." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !canWriteResourceData(user.role)) {
      return NextResponse.json({ error: "Unauthorized. Write permissions required." }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createWaterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { buildingId, quantity, recordedAt, category, notes } = parsed.data;

    // Verify building belongs to user's organization
    const building = await prisma.building.findFirst({
      where: { id: buildingId, organizationId: user.organizationId },
    });

    if (!building) {
      return NextResponse.json({ error: "Invalid building specified." }, { status: 400 });
    }

    const record = await prisma.resourceRecord.create({
      data: {
        organizationId: user.organizationId,
        buildingId,
        resourceType: "WATER",
        quantity,
        unit: "L",
        category: category || "General Facilities",
        recordedAt: new Date(recordedAt),
        dataSource: "MANUAL",
        notes,
        createdBy: user.name,
      },
      include: { building: true },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: "CREATE",
        entityType: "RESOURCE_RECORD",
        entityId: record.id,
        details: `Created water record: ${quantity} L for ${building.name}`,
      },
    });

    return NextResponse.json({ success: true, record });
  } catch (error) {
    console.error("Create water record error:", error);
    return NextResponse.json({ error: "Failed to create water record." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !canWriteResourceData(user.role)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing ID." }, { status: 400 });

    const record = await prisma.resourceRecord.findFirst({
      where: { id, organizationId: user.organizationId },
    });

    if (!record) return NextResponse.json({ error: "Record not found." }, { status: 404 });

    await prisma.resourceRecord.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Record deleted." });
  } catch (error) {
    console.error("Delete water record error:", error);
    return NextResponse.json({ error: "Failed to delete water record." }, { status: 500 });
  }
}
