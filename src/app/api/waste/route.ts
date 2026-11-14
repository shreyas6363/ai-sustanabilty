import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";
import { canWriteResourceData } from "@/lib/auth/roles";
import { z } from "zod";

const createWasteSchema = z.object({
  buildingId: z.string().min(1, "Building is required"),
  wasteCategory: z.enum([
    "ORGANIC",
    "PAPER",
    "PLASTIC",
    "GLASS",
    "METAL",
    "E_WASTE",
    "RESIDUAL",
    "OTHER",
  ]),
  quantityKg: z.number().positive("Quantity must be positive"),
  disposalMethod: z.enum([
    "RECYCLING",
    "COMPOSTING",
    "LANDFILL",
    "INCINERATION",
    "SPECIAL_PROCESSING",
  ]),
  recyclable: z.boolean().default(false),
  recordedAt: z.string().min(1, "Date is required"),
  collectionDetails: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const orgId = user?.organizationId || "demo-org-greenvalley";

    const { searchParams } = new URL(req.url);
    const buildingId = searchParams.get("buildingId");
    const category = searchParams.get("category");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const daysParam = parseInt(searchParams.get("days") || "90", 10);

    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - daysParam);

    const where: Record<string, unknown> = {
      organizationId: orgId,
      recordedAt: { gte: periodStart },
    };

    if (buildingId && buildingId !== "ALL") where.buildingId = buildingId;
    if (category && category !== "ALL") where.wasteCategory = category;

    // 1. Fetch records
    const records = await prisma.wasteRecord.findMany({
      where,
      orderBy: { recordedAt: "desc" },
      include: { building: true },
      take: limit,
    });

    // 2. Fetch full historical series for aggregation
    const fullSeries = await prisma.wasteRecord.findMany({
      where: {
        organizationId: orgId,
        recordedAt: { gte: periodStart },
        ...(buildingId && buildingId !== "ALL" ? { buildingId } : {}),
      },
      orderBy: { recordedAt: "asc" },
      include: { building: true },
    });

    let totalKg = 0;
    let recycledKg = 0;
    let compostKg = 0;
    let landfillKg = 0;
    let otherKg = 0;

    const categoryMap: Record<string, number> = {};
    const methodMap: Record<string, number> = {};
    const dailyMap: Record<string, { date: string; totalKg: number; recycledKg: number }> = {};
    const buildingMap: Record<string, { name: string; code: string; totalKg: number; recycledKg: number }> = {};

    for (const w of fullSeries) {
      totalKg += w.quantityKg;
      categoryMap[w.wasteCategory] = (categoryMap[w.wasteCategory] || 0) + w.quantityKg;
      methodMap[w.disposalMethod] = (methodMap[w.disposalMethod] || 0) + w.quantityKg;

      const isDiverted = w.disposalMethod === "RECYCLING" || w.disposalMethod === "COMPOSTING";
      if (w.disposalMethod === "RECYCLING") recycledKg += w.quantityKg;
      else if (w.disposalMethod === "COMPOSTING") compostKg += w.quantityKg;
      else if (w.disposalMethod === "LANDFILL") landfillKg += w.quantityKg;
      else otherKg += w.quantityKg;

      const d = w.recordedAt.toISOString().split("T")[0];
      if (!dailyMap[d]) dailyMap[d] = { date: d, totalKg: 0, recycledKg: 0 };
      dailyMap[d].totalKg += w.quantityKg;
      if (isDiverted) dailyMap[d].recycledKg += w.quantityKg;

      if (!buildingMap[w.buildingId]) {
        buildingMap[w.buildingId] = {
          name: w.building.name,
          code: w.building.code,
          totalKg: 0,
          recycledKg: 0,
        };
      }
      buildingMap[w.buildingId].totalKg += w.quantityKg;
      if (isDiverted) buildingMap[w.buildingId].recycledKg += w.quantityKg;
    }

    const diversionRatePct =
      totalKg > 0 ? Number((((recycledKg + compostKg) / totalKg) * 100).toFixed(1)) : 0;

    const timeSeries = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      summary: {
        totalKg: Math.round(totalKg),
        recycledKg: Math.round(recycledKg),
        compostKg: Math.round(compostKg),
        landfillKg: Math.round(landfillKg),
        otherKg: Math.round(otherKg),
        diversionRatePct,
        dailyAverageKg: Math.round(totalKg / Math.max(1, timeSeries.length)),
      },
      categoryBreakdown: Object.entries(categoryMap).map(([name, value]) => ({
        name,
        value: Math.round(value),
      })),
      disposalMethods: Object.entries(methodMap).map(([name, value]) => ({
        name,
        value: Math.round(value),
      })),
      buildingBreakdown: Object.values(buildingMap),
      timeSeries,
      records,
    });
  } catch (error) {
    console.error("Waste API error:", error);
    return NextResponse.json({ error: "Failed to load waste data." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !canWriteResourceData(user.role)) {
      return NextResponse.json({ error: "Unauthorized. Write permissions required." }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createWasteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const {
      buildingId,
      wasteCategory,
      quantityKg,
      disposalMethod,
      recyclable,
      recordedAt,
      collectionDetails,
      notes,
    } = parsed.data;

    const building = await prisma.building.findFirst({
      where: { id: buildingId, organizationId: user.organizationId },
    });

    if (!building) {
      return NextResponse.json({ error: "Invalid building specified." }, { status: 400 });
    }

    const record = await prisma.wasteRecord.create({
      data: {
        organizationId: user.organizationId,
        buildingId,
        wasteCategory,
        quantityKg,
        disposalMethod,
        recyclable,
        recordedAt: new Date(recordedAt),
        dataSource: "MANUAL",
        collectionDetails,
        notes,
      },
      include: { building: true },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: "CREATE",
        entityType: "WASTE_RECORD",
        entityId: record.id,
        details: `Logged ${quantityKg} kg of ${wasteCategory} waste for ${building.name}`,
      },
    });

    return NextResponse.json({ success: true, record });
  } catch (error) {
    console.error("Create waste record error:", error);
    return NextResponse.json({ error: "Failed to create waste record." }, { status: 500 });
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

    const record = await prisma.wasteRecord.findFirst({
      where: { id, organizationId: user.organizationId },
    });

    if (!record) return NextResponse.json({ error: "Record not found." }, { status: 404 });

    await prisma.wasteRecord.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Waste record deleted." });
  } catch (error) {
    console.error("Delete waste record error:", error);
    return NextResponse.json({ error: "Failed to delete waste record." }, { status: 500 });
  }
}
