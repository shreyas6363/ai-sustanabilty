import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { z } from "zod";

const telemetrySchema = z.object({
  value: z.number().positive("Reading value must be positive"),
  unit: z.string().optional(),
  timestamp: z.string().optional(),
  category: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("x-device-token");

    if (!token) {
      return NextResponse.json(
        { error: "Authentication failed. Missing 'x-device-token' header." },
        { status: 401 }
      );
    }

    const device = await prisma.device.findUnique({
      where: { apiKey: token },
      include: { building: true },
    });

    if (!device) {
      return NextResponse.json(
        { error: "Unauthorized. Invalid device credentials." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = telemetrySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { value, timestamp, category, notes } = parsed.data;
    const recordedAt = timestamp ? new Date(timestamp) : new Date();

    // Determine resource type from deviceType
    let resourceType: "WATER" | "ELECTRICITY" = "WATER";
    let standardUnit = "L";

    if (device.deviceType === "ENERGY_METER") {
      resourceType = "ELECTRICITY";
      standardUnit = "kWh";
    }

    // 1. Update device status
    await prisma.device.update({
      where: { id: device.id },
      data: {
        lastSeenAt: new Date(),
        lastReadingValue: value,
        deviceStatus: "ONLINE",
      },
    });

    // 2. Record reading in ResourceRecord
    const record = await prisma.resourceRecord.create({
      data: {
        organizationId: device.organizationId,
        buildingId: device.buildingId,
        resourceType,
        quantity: value,
        unit: standardUnit,
        category: category || `${device.deviceName} Ingestion`,
        recordedAt,
        dataSource: device.isSimulated ? "DEMO_SIMULATION" : "IOT_SENSOR",
        notes: notes || `Ingested via IoT telemetry from ${device.deviceName}`,
        createdBy: `Device: ${device.deviceName}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Telemetry ingested successfully.",
      recordId: record.id,
      device: {
        id: device.id,
        name: device.deviceName,
        building: device.building.name,
        isSimulated: device.isSimulated,
      },
    });
  } catch (error) {
    console.error("IoT ingestion error:", error);
    return NextResponse.json({ error: "Failed to ingest telemetry." }, { status: 500 });
  }
}
