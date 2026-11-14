import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";
import { validateAndParseCsv } from "@/lib/validation/csv";
import { canWriteResourceData } from "@/lib/auth/roles";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !canWriteResourceData(user.role)) {
      return NextResponse.json({ error: "Unauthorized. Write access required." }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const recordKind = (formData.get("recordKind") as string || "RESOURCE").toUpperCase() as "RESOURCE" | "WASTE";

    if (!file) {
      return NextResponse.json({ error: "No CSV file provided." }, { status: 400 });
    }

    const csvText = await file.text();
    const validation = validateAndParseCsv(csvText, recordKind);

    if (validation.validRows.length === 0) {
      return NextResponse.json(
        {
          error: "No valid rows found in CSV file.",
          details: validation.invalidRows,
          duplicateCount: validation.duplicateCount,
        },
        { status: 400 }
      );
    }

    // Lookup organization's buildings to map building codes
    const buildings = await prisma.building.findMany({
      where: { organizationId: user.organizationId },
    });
    const codeMap = new Map(buildings.map((b) => [b.code.toUpperCase(), b.id]));

    // Check for unmapped building codes
    const unmappedCodes = new Set<string>();
    const readyRows = [];

    for (const r of validation.validRows) {
      const bId = codeMap.get(r.buildingCode.toUpperCase());
      if (!bId) {
        unmappedCodes.add(r.buildingCode);
      } else {
        readyRows.push({ ...r, resolvedBuildingId: bId });
      }
    }

    if (unmappedCodes.size > 0) {
      return NextResponse.json(
        {
          error: `Unrecognized building codes encountered: ${Array.from(unmappedCodes).join(", ")}. Please register these buildings before importing.`,
          unmappedCodes: Array.from(unmappedCodes),
        },
        { status: 400 }
      );
    }

    // Insert records in batch
    let insertedCount = 0;

    if (recordKind === "RESOURCE") {
      const recordsToInsert = readyRows.map((r) => ({
        organizationId: user.organizationId,
        buildingId: r.resolvedBuildingId,
        resourceType: r.resourceType || "WATER",
        quantity: r.quantity,
        unit: r.unit || (r.resourceType === "WATER" ? "L" : "kWh"),
        category: r.category || "CSV Bulk Import",
        recordedAt: new Date(r.date),
        dataSource: "CSV_IMPORT",
        notes: r.notes || `Imported from ${file.name}`,
        createdBy: user.name,
      }));

      await prisma.resourceRecord.createMany({ data: recordsToInsert });
      insertedCount = recordsToInsert.length;
    } else {
      const wasteToInsert = readyRows.map((r) => ({
        organizationId: user.organizationId,
        buildingId: r.resolvedBuildingId,
        wasteCategory: r.wasteCategory || "RESIDUAL",
        quantityKg: r.quantity,
        disposalMethod: r.disposalMethod || "RECYCLING",
        recyclable: Boolean(r.recyclable),
        recordedAt: new Date(r.date),
        dataSource: "CSV_IMPORT",
        notes: r.notes || `Imported from ${file.name}`,
      }));

      await prisma.wasteRecord.createMany({ data: wasteToInsert });
      insertedCount = wasteToInsert.length;
    }

    // Audit Log
    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: "IMPORT",
        entityType: recordKind === "RESOURCE" ? "RESOURCE_RECORD" : "WASTE_RECORD",
        details: `Imported ${insertedCount} rows from ${file.name} (${validation.duplicateCount} duplicates skipped, ${validation.invalidRows.length} errors)`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${insertedCount} ${recordKind.toLowerCase()} records.`,
      insertedCount,
      duplicateCount: validation.duplicateCount,
      invalidRowCount: validation.invalidRows.length,
      invalidRows: validation.invalidRows.slice(0, 10), // return sample of errors
    });
  } catch (error) {
    console.error("CSV import error:", error);
    return NextResponse.json({ error: "Failed to process CSV import." }, { status: 500 });
  }
}
