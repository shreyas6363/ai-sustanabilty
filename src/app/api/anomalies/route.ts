import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";
import { canManageRecommendations } from "@/lib/auth/roles";
import { z } from "zod";

const updateAnomalySchema = z.object({
  id: z.string().min(1),
  status: z.enum(["OPEN", "INVESTIGATING", "RESOLVED", "DISMISSED"]),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const orgId = user?.organizationId || "demo-org-greenvalley";

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const resourceType = searchParams.get("resourceType");

    const where: Record<string, unknown> = { organizationId: orgId };
    if (status && status !== "ALL") where.status = status;
    if (resourceType && resourceType !== "ALL") where.resourceType = resourceType;

    const anomalies = await prisma.anomaly.findMany({
      where,
      orderBy: { detectedAt: "desc" },
      include: { building: true },
    });

    return NextResponse.json({ anomalies });
  } catch (error) {
    console.error("Anomalies API error:", error);
    return NextResponse.json({ error: "Failed to fetch anomalies." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !canManageRecommendations(user.role)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateAnomalySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { id, status, notes } = parsed.data;

    const anomaly = await prisma.anomaly.findFirst({
      where: { id, organizationId: user.organizationId },
    });

    if (!anomaly) {
      return NextResponse.json({ error: "Anomaly not found." }, { status: 404 });
    }

    const updated = await prisma.anomaly.update({
      where: { id },
      data: {
        status,
        notes: notes !== undefined ? notes : anomaly.notes,
        resolvedAt: status === "RESOLVED" || status === "DISMISSED" ? new Date() : null,
      },
      include: { building: true },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: "RESOLVE_ALERT",
        entityType: "ANOMALY",
        entityId: id,
        details: `Anomaly ${anomaly.resourceType} in ${anomaly.buildingId} updated to ${status}`,
      },
    });

    return NextResponse.json({ success: true, anomaly: updated });
  } catch (error) {
    console.error("Update anomaly error:", error);
    return NextResponse.json({ error: "Failed to update anomaly." }, { status: 500 });
  }
}
