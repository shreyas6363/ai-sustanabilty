import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";
import { exportToSafeCsv } from "@/lib/validation/csv";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const orgId = user?.organizationId || "demo-org-greenvalley";

    const { searchParams } = new URL(req.url);
    const type = (searchParams.get("type") || "water").toLowerCase();

    if (type === "water" || type === "energy") {
      const resourceType = type === "water" ? "WATER" : "ELECTRICITY";
      const records = await prisma.resourceRecord.findMany({
        where: { organizationId: orgId, resourceType },
        orderBy: { recordedAt: "desc" },
        include: { building: true },
        take: 2000,
      });

      const formatted = records.map((r) => ({
        date: r.recordedAt.toISOString().split("T")[0],
        buildingCode: r.building.code,
        buildingName: r.building.name,
        resourceType: r.resourceType,
        quantity: r.quantity,
        unit: r.unit,
        category: r.category || "",
        dataSource: r.dataSource,
        notes: r.notes || "",
      }));

      const csv = exportToSafeCsv(formatted, [
        { key: "date", label: "Date" },
        { key: "buildingCode", label: "Building Code" },
        { key: "buildingName", label: "Building Name" },
        { key: "resourceType", label: "Resource Type" },
        { key: "quantity", label: "Quantity" },
        { key: "unit", label: "Unit" },
        { key: "category", label: "Category" },
        { key: "dataSource", label: "Data Source" },
        { key: "notes", label: "Notes" },
      ]);

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="ecopulse_${type}_records.csv"`,
        },
      });
    } else {
      // Waste Export
      const records = await prisma.wasteRecord.findMany({
        where: { organizationId: orgId },
        orderBy: { recordedAt: "desc" },
        include: { building: true },
        take: 2000,
      });

      const formatted = records.map((r) => ({
        date: r.recordedAt.toISOString().split("T")[0],
        buildingCode: r.building.code,
        buildingName: r.building.name,
        wasteCategory: r.wasteCategory,
        quantityKg: r.quantityKg,
        disposalMethod: r.disposalMethod,
        recyclable: r.recyclable ? "Yes" : "No",
        dataSource: r.dataSource,
        notes: r.notes || "",
      }));

      const csv = exportToSafeCsv(formatted, [
        { key: "date", label: "Date" },
        { key: "buildingCode", label: "Building Code" },
        { key: "buildingName", label: "Building Name" },
        { key: "wasteCategory", label: "Waste Category" },
        { key: "quantityKg", label: "Quantity (kg)" },
        { key: "disposalMethod", label: "Disposal Method" },
        { key: "recyclable", label: "Recyclable" },
        { key: "dataSource", label: "Data Source" },
        { key: "notes", label: "Notes" },
      ]);

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="ecopulse_waste_records.csv"`,
        },
      });
    }
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Failed to export data." }, { status: 500 });
  }
}
