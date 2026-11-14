import { AnomalySeverity, ResourceType } from "@/types";

export interface DataPoint {
  id?: string;
  date: Date;
  value: number;
  buildingId: string;
  buildingName?: string;
  resourceType: ResourceType;
  operatingSchedule?: string | null;
}

export interface DetectedAnomalyResult {
  buildingId: string;
  buildingName?: string;
  resourceType: ResourceType;
  date: Date;
  observedValue: number;
  expectedValue: number;
  deviationPct: number;
  severity: AnomalySeverity;
  explanation: string;
}

export function detectResourceAnomalies(
  dataPoints: DataPoint[],
  minBaselinePoints = 7
): DetectedAnomalyResult[] {
  if (dataPoints.length < minBaselinePoints) {
    return [];
  }

  // Sort chronologically
  const sorted = [...dataPoints].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  const results: DetectedAnomalyResult[] = [];

  // Group by building
  const byBuilding: Record<string, DataPoint[]> = {};
  for (const pt of sorted) {
    if (!byBuilding[pt.buildingId]) byBuilding[pt.buildingId] = [];
    byBuilding[pt.buildingId].push(pt);
  }

  for (const buildingId in byBuilding) {
    const series = byBuilding[buildingId];
    if (series.length < minBaselinePoints) continue;

    const values = series.map((s) => s.value);

    // Compute rolling 14-day or full baseline
    for (let i = minBaselinePoints; i < series.length; i++) {
      const current = series[i];
      // Use previous up to 21 days as the historical baseline window
      const windowStart = Math.max(0, i - 21);
      const window = values.slice(windowStart, i);

      const mean = window.reduce((sum, v) => sum + v, 0) / window.length;
      const variance =
        window.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / window.length;
      const stdDev = Math.sqrt(variance);

      if (mean <= 0) continue;

      const deviationPct = Number((((current.value - mean) / mean) * 100).toFixed(1));
      const zScore = stdDev > 0 ? (current.value - mean) / stdDev : 0;

      // Check day of week (0=Sunday, 6=Saturday)
      const isWeekend = current.date.getDay() === 0 || current.date.getDay() === 6;
      
      // Determine severity
      let severity: AnomalySeverity | null = null;
      let reasonType = "spike";

      if (deviationPct >= 75 || zScore >= 3.0) {
        severity = "CRITICAL";
      } else if (deviationPct >= 40 || zScore >= 2.2) {
        severity = "HIGH";
      } else if (deviationPct >= 25 || zScore >= 1.7) {
        severity = "MEDIUM";
      } else if (deviationPct >= 18 && zScore >= 1.4) {
        severity = "LOW";
      }

      // Special check: Weekend surge in an academic/office building
      if (isWeekend && deviationPct > 30) {
        reasonType = "weekend_surge";
        if (!severity || severity === "LOW") severity = "MEDIUM";
      }

      if (severity) {
        const buildingLabel = current.buildingName || "Building";
        const unit = current.resourceType === "WATER" ? "L" : "kWh";
        let explanation = "";

        if (current.resourceType === "WATER") {
          if (reasonType === "weekend_surge") {
            explanation = `Unusually high weekend water draw of ${current.value.toLocaleString()} ${unit} (+${deviationPct}% vs. ${mean.toFixed(0)} ${unit} baseline). Possible continuous fixture leak, running irrigation, or unclosed valve.`;
          } else {
            explanation = `Suspicious consumption surge of ${current.value.toLocaleString()} ${unit} detected (+${deviationPct}% above the ${mean.toFixed(0)} ${unit} historical baseline). May indicate plumbing defect or abnormal facility draw requiring inspection.`;
          }
        } else {
          // Electricity
          if (reasonType === "weekend_surge") {
            explanation = `Elevated weekend electricity draw of ${current.value.toLocaleString()} ${unit} (+${deviationPct}% above baseline). Potential after-hours HVAC or lab equipment left active outside scheduled operating hours.`;
          } else {
            explanation = `Significant electricity spike of ${current.value.toLocaleString()} ${unit} recorded (+${deviationPct}% above ${mean.toFixed(0)} ${unit} baseline). Check heavy appliances, chillers, or cooling systems.`;
          }
        }

        results.push({
          buildingId,
          buildingName: current.buildingName,
          resourceType: current.resourceType,
          date: current.date,
          observedValue: current.value,
          expectedValue: Number(mean.toFixed(1)),
          deviationPct,
          severity,
          explanation,
        });
      }
    }
  }

  return results;
}
