import Papa from "papaparse";

export interface ParsedCsvRow {
  date: string;
  buildingCode: string;
  resourceType?: string;
  quantity: number;
  unit?: string;
  category?: string;
  wasteCategory?: string;
  disposalMethod?: string;
  recyclable?: boolean;
  notes?: string;
  dataSource?: string;
}

export interface CsvValidationResult {
  validRows: ParsedCsvRow[];
  invalidRows: { rowNumber: number; data: unknown; errors: string[] }[];
  totalRows: number;
  duplicateCount: number;
}

/**
 * Sanitizes a value against CSV / Spreadsheet formula injection (CWE-1236)
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let str = String(value).trim();
  // If value starts with formula triggers (=, +, -, @, \t, \r), prepend a single quote
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return str;
}

/**
 * Safely stringifies an array of objects into safe CSV text
 */
export function exportToSafeCsv<T extends Record<string, unknown>>(
  rows: T[],
  headers: { key: keyof T; label: string }[]
): string {
  const headerLine = headers.map((h) => `"${h.label.replace(/"/g, '""')}"`).join(",");
  const dataLines = rows.map((row) =>
    headers
      .map((h) => {
        const val = row[h.key];
        const sanitized = sanitizeCsvCell(val);
        return `"${sanitized.replace(/"/g, '""')}"`;
      })
      .join(",")
  );

  return [headerLine, ...dataLines].join("\r\n");
}

/**
 * Validates and parses uploaded CSV text for Resource or Waste records
 */
export function validateAndParseCsv(
  csvText: string,
  recordKind: "RESOURCE" | "WASTE"
): CsvValidationResult {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim().toLowerCase().replace(/[\s_-]+/g, ""),
  });

  const validRows: ParsedCsvRow[] = [];
  const invalidRows: { rowNumber: number; data: unknown; errors: string[] }[] = [];
  const seenKeys = new Set<string>();
  let duplicateCount = 0;

  parsed.data.forEach((row, index) => {
    const rowNumber = index + 2; // +1 for 0-index, +1 for header
    const errors: string[] = [];

    // Common fields: date, buildingcode, quantity
    const dateStr =
      row["date"] || row["recordedat"] || row["timestamp"] || row["day"];
    const buildingCode =
      row["buildingcode"] ||
      row["building"] ||
      row["code"] ||
      row["buildingname"] ||
      row["location"];
    const quantityStr =
      row["quantity"] ||
      row["amount"] ||
      row["value"] ||
      row["litres"] ||
      row["kwh"] ||
      row["kg"] ||
      row["quantitykg"];

    if (!dateStr) errors.push("Missing required 'Date' column.");
    else if (isNaN(new Date(dateStr).getTime())) errors.push("Invalid date format.");

    if (!buildingCode) errors.push("Missing required 'Building Code' column.");

    const quantity = parseFloat(quantityStr);
    if (isNaN(quantity) || quantity < 0) {
      errors.push("Quantity must be a valid non-negative number.");
    }

    if (recordKind === "RESOURCE") {
      const resourceTypeRaw = (
        row["resourcetype"] ||
        row["type"] ||
        row["resource"] ||
        ""
      ).toUpperCase();
      const unitRaw = (row["unit"] || "").trim();

      let inferredType: "WATER" | "ELECTRICITY" | null = null;
      if (resourceTypeRaw.includes("WATER") || unitRaw.toLowerCase() === "l" || unitRaw.toLowerCase() === "litres") {
        inferredType = "WATER";
      } else if (resourceTypeRaw.includes("ELEC") || unitRaw.toLowerCase() === "kwh") {
        inferredType = "ELECTRICITY";
      }

      if (!inferredType) {
        errors.push("Resource type must be either WATER or ELECTRICITY (or provide valid unit 'L' or 'kWh').");
      }

      if (errors.length > 0) {
        invalidRows.push({ rowNumber, data: row, errors });
      } else {
        const uniqueKey = `${new Date(dateStr).toISOString().split("T")[0]}_${buildingCode.toUpperCase()}_${inferredType}`;
        if (seenKeys.has(uniqueKey)) {
          duplicateCount++;
          errors.push("Duplicate record: identical date, building, and resource type already encountered in this batch.");
          invalidRows.push({ rowNumber, data: row, errors });
        } else {
          seenKeys.add(uniqueKey);
          validRows.push({
            date: new Date(dateStr).toISOString(),
            buildingCode: buildingCode.trim().toUpperCase(),
            resourceType: inferredType!,
            quantity,
            unit: inferredType === "WATER" ? "L" : "kWh",
            category: row["category"] || undefined,
            notes: row["notes"] || row["description"] || undefined,
            dataSource: "CSV_IMPORT",
          });
        }
      }
    } else {
      // Waste Record
      const categoryRaw = (
        row["wastecategory"] ||
        row["category"] ||
        row["type"] ||
        "RESIDUAL"
      ).toUpperCase().replace(/[\s-]+/g, "_");

      const validCategories = [
        "ORGANIC",
        "PAPER",
        "PLASTIC",
        "GLASS",
        "METAL",
        "E_WASTE",
        "RESIDUAL",
        "OTHER",
      ];

      const wasteCategory = validCategories.includes(categoryRaw)
        ? categoryRaw
        : "RESIDUAL";

      const recyclableStr = (row["recyclable"] || "").toLowerCase();
      const recyclable =
        recyclableStr === "true" ||
        recyclableStr === "yes" ||
        recyclableStr === "1" ||
        ["PAPER", "PLASTIC", "GLASS", "METAL"].includes(wasteCategory);

      if (errors.length > 0) {
        invalidRows.push({ rowNumber, data: row, errors });
      } else {
        const uniqueKey = `${new Date(dateStr).toISOString().split("T")[0]}_${buildingCode.toUpperCase()}_${wasteCategory}`;
        if (seenKeys.has(uniqueKey)) {
          duplicateCount++;
          errors.push("Duplicate record: identical date, building, and waste category already encountered.");
          invalidRows.push({ rowNumber, data: row, errors });
        } else {
          seenKeys.add(uniqueKey);
          validRows.push({
            date: new Date(dateStr).toISOString(),
            buildingCode: buildingCode.trim().toUpperCase(),
            wasteCategory,
            quantity,
            disposalMethod: row["disposalmethod"] || (recyclable ? "RECYCLING" : "LANDFILL"),
            recyclable,
            notes: row["notes"] || undefined,
            dataSource: "CSV_IMPORT",
          });
        }
      }
    }
  });

  return {
    validRows,
    invalidRows,
    totalRows: parsed.data.length,
    duplicateCount,
  };
}
