import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";
import { z } from "zod";

const updateAlertSchema = z.object({
  id: z.string().min(1),
  isRead: z.boolean().optional(),
  isResolved: z.boolean().optional(),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    const orgId = user?.organizationId || "demo-org-greenvalley";

    const alerts = await prisma.alertNotification.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      include: { building: true },
      take: 50,
    });

    const unreadCount = alerts.filter((a) => !a.isRead).length;

    return NextResponse.json({ alerts, unreadCount });
  } catch (error) {
    console.error("Alerts API error:", error);
    return NextResponse.json({ error: "Failed to fetch alerts." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const orgId = user?.organizationId || "demo-org-greenvalley";

    const body = await req.json();
    const parsed = updateAlertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { id, isRead, isResolved } = parsed.data;

    const alert = await prisma.alertNotification.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!alert) {
      return NextResponse.json({ error: "Alert not found." }, { status: 404 });
    }

    const updated = await prisma.alertNotification.update({
      where: { id },
      data: {
        ...(isRead !== undefined ? { isRead } : {}),
        ...(isResolved !== undefined ? { isResolved } : {}),
      },
    });

    return NextResponse.json({ success: true, alert: updated });
  } catch (error) {
    console.error("Update alert error:", error);
    return NextResponse.json({ error: "Failed to update alert." }, { status: 500 });
  }
}
