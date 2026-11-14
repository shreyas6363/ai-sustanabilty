import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";
import { canManageRecommendations } from "@/lib/auth/roles";
import { z } from "zod";

const updateRecommendationSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["PROPOSED", "ACCEPTED", "IN_PROGRESS", "COMPLETED", "DISMISSED"]),
  implementationNotes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const orgId = user?.organizationId || "demo-org-greenvalley";

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {
      organizationId: orgId,
    };

    if (category && category !== "ALL") where.category = category;
    if (status && status !== "ALL") where.status = status;

    const recommendations = await prisma.recommendation.findMany({
      where,
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      include: { building: true },
    });

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error("Recommendations API error:", error);
    return NextResponse.json({ error: "Failed to fetch recommendations." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !canManageRecommendations(user.role)) {
      return NextResponse.json({ error: "Unauthorized. Manager or Admin rights required." }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateRecommendationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { id, status, implementationNotes } = parsed.data;

    const rec = await prisma.recommendation.findFirst({
      where: { id, organizationId: user.organizationId },
    });

    if (!rec) {
      return NextResponse.json({ error: "Recommendation not found." }, { status: 404 });
    }

    const updated = await prisma.recommendation.update({
      where: { id },
      data: {
        status,
        implementationNotes: implementationNotes !== undefined ? implementationNotes : rec.implementationNotes,
      },
      include: { building: true },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: "UPDATE",
        entityType: "RECOMMENDATION",
        entityId: id,
        details: `Updated recommendation status to ${status}: "${rec.title}"`,
      },
    });

    return NextResponse.json({ success: true, recommendation: updated });
  } catch (error) {
    console.error("Update recommendation error:", error);
    return NextResponse.json({ error: "Failed to update recommendation." }, { status: 500 });
  }
}
