import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";
import { canManageSettings } from "@/lib/auth/roles";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  location: z.string().min(2).optional(),
  areaSqFt: z.number().positive().optional().nullable(),
  occupancy: z.number().int().positive().optional().nullable(),
  operatingSchedule: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "RENOVATION"]).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const orgId = user?.organizationId || "demo-org-greenvalley";

    const building = await prisma.building.findFirst({
      where: { id: params.id, organizationId: orgId },
      include: {
        devices: true,
        anomalies: { orderBy: { detectedAt: "desc" }, take: 10 },
        recommendations: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!building) {
      return NextResponse.json({ error: "Building not found." }, { status: 404 });
    }

    // 90 day resources
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const resources = await prisma.resourceRecord.findMany({
      where: { buildingId: building.id, recordedAt: { gte: ninetyDaysAgo } },
      orderBy: { recordedAt: "asc" },
    });

    const waste = await prisma.wasteRecord.findMany({
      where: { buildingId: building.id, recordedAt: { gte: ninetyDaysAgo } },
      orderBy: { recordedAt: "asc" },
    });

    return NextResponse.json({ building, resources, waste });
  } catch (error) {
    console.error("Get building error:", error);
    return NextResponse.json({ error: "Failed to fetch building." }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !canManageSettings(user.role)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const updated = await prisma.building.update({
      where: { id: params.id },
      data: parsed.data,
    });

    return NextResponse.json({ success: true, building: updated });
  } catch (error) {
    console.error("Update building error:", error);
    return NextResponse.json({ error: "Failed to update building." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !canManageSettings(user.role)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    await prisma.building.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: "Building deleted." });
  } catch (error) {
    console.error("Delete building error:", error);
    return NextResponse.json({ error: "Failed to delete building." }, { status: 500 });
  }
}
