import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";
import { canManageSettings } from "@/lib/auth/roles";
import { z } from "zod";

const updateOrgSchema = z.object({
  name: z.string().min(2).optional(),
  organizationType: z.string().min(2).optional(),
  location: z.string().min(2).optional(),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    const orgId = user?.organizationId || "demo-org-greenvalley";

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        users: { select: { id: true, name: true, email: true, role: true, createdAt: true } },
        emissionFactors: true,
        auditLogs: { orderBy: { createdAt: "desc" }, take: 25 },
      },
    });

    return NextResponse.json({ organization: org });
  } catch (error) {
    console.error("Settings GET error:", error);
    return NextResponse.json({ error: "Failed to load settings." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !canManageSettings(user.role)) {
      return NextResponse.json({ error: "Unauthorized. Admin rights required." }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateOrgSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const updated = await prisma.organization.update({
      where: { id: user.organizationId },
      data: parsed.data,
    });

    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: "UPDATE",
        entityType: "ORGANIZATION",
        entityId: updated.id,
        details: `Updated organization settings`,
      },
    });

    return NextResponse.json({ success: true, organization: updated });
  } catch (error) {
    console.error("Settings PATCH error:", error);
    return NextResponse.json({ error: "Failed to update settings." }, { status: 500 });
  }
}
