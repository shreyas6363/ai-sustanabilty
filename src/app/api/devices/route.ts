import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";
import { canManageSettings } from "@/lib/auth/roles";
import { z } from "zod";
import crypto from "crypto";

const registerDeviceSchema = z.object({
  buildingId: z.string().min(1, "Building is required"),
  deviceName: z.string().min(2, "Device name is required"),
  deviceType: z.enum([
    "WATER_METER",
    "ENERGY_METER",
    "SMART_BIN_SCALE",
    "ENVIRONMENTAL_SENSOR",
  ]),
  isSimulated: z.boolean().default(true),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    const orgId = user?.organizationId || "demo-org-greenvalley";

    const devices = await prisma.device.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      include: { building: true },
    });

    return NextResponse.json({ devices });
  } catch (error) {
    console.error("Devices API error:", error);
    return NextResponse.json({ error: "Failed to load devices." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !canManageSettings(user.role)) {
      return NextResponse.json({ error: "Unauthorized. Admin rights required." }, { status: 403 });
    }

    const body = await req.json();
    const parsed = registerDeviceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { buildingId, deviceName, deviceType, isSimulated } = parsed.data;

    // Generate unique ingestion API key for this device
    const apiKey = `dev_${crypto.randomBytes(16).toString("hex")}`;

    const device = await prisma.device.create({
      data: {
        organizationId: user.organizationId,
        buildingId,
        deviceName,
        deviceType,
        apiKey,
        deviceStatus: isSimulated ? "SIMULATED" : "ONLINE",
        isSimulated,
        lastSeenAt: new Date(),
      },
      include: { building: true },
    });

    return NextResponse.json({
      success: true,
      device,
      apiKeyNotice:
        "Save this API key securely. It must be provided in the 'x-device-token' header when sending telemetry to /api/devices/ingest.",
    });
  } catch (error) {
    console.error("Register device error:", error);
    return NextResponse.json({ error: "Failed to register device." }, { status: 500 });
  }
}
