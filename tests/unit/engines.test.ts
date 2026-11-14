import { describe, it, expect } from "vitest";
import { calculateEmissions, DEFAULT_EMISSION_FACTORS } from "../../src/lib/carbon/calculator";
import { detectResourceAnomalies, DataPoint } from "../../src/lib/anomalies/detector";
import { generate7DayForecast, HistoricalObservation } from "../../src/lib/forecasting/engine";
import { calculateSustainabilityScore } from "../../src/lib/analytics/sustainabilityScore";
import { runWhatIfSimulation, BaselineData } from "../../src/lib/analytics/whatIfSimulator";
import { sanitizeCsvCell, validateAndParseCsv } from "../../src/lib/validation/csv";

describe("Carbon Footprint Engine", () => {
  it("calculates emissions correctly using activity * factor", () => {
    const electricityKwh = 1000;
    const waterLitres = 10000;
    const waste = {
      landfillKg: 100,
      compostKg: 50,
      recyclingKg: 40,
      otherKg: 0,
    };

    const result = calculateEmissions(electricityKwh, waterLitres, waste);

    // 1000 * 0.42 = 420 kg
    expect(result.electricityEmissionsKg).toBe(420);
    // 10000 * 0.00035 = 3.5 kg
    expect(result.waterEmissionsKg).toBe(3.5);
    // 100 * 0.58 (58) + 50 * 0.06 (3) + 40 * 0.09 (3.6) = 64.6 kg
    expect(result.wasteEmissionsKg).toBe(64.6);
    // Total = 420 + 3.5 + 64.6 = 488.1 kg
    expect(result.totalEmissionsKg).toBe(488.1);
    expect(result.totalEmissionsMetricTonnes).toBe(0.488);
    expect(result.scopeBreakdown.scope2Kg).toBe(420);
    expect(result.scopeBreakdown.scope3Kg).toBe(68.1);
  });

  it("supports custom emission factors configured by administrator", () => {
    const customFactors = {
      ELECTRICITY: 0.25, // Green renewable grid
    };
    const result = calculateEmissions(1000, 0, { landfillKg: 0, compostKg: 0, recyclingKg: 0, otherKg: 0 }, customFactors);
    expect(result.electricityEmissionsKg).toBe(250);
  });
});

describe("Anomaly Detection Engine", () => {
  it("detects critical water consumption surge above baseline", () => {
    const points: DataPoint[] = [];
    const baseDate = new Date("2025-01-01T12:00:00Z");

    // 14 days of baseline ~10,000 L
    for (let i = 0; i < 14; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      points.push({
        date: d,
        value: 10000 + (i % 2 === 0 ? 200 : -200),
        buildingId: "b-hostel",
        buildingName: "Student Hostel",
        resourceType: "WATER",
      });
    }

    // Day 15: +90% surge (19,000 L)
    const surgeDate = new Date(baseDate);
    surgeDate.setDate(surgeDate.getDate() + 14);
    points.push({
      date: surgeDate,
      value: 19000,
      buildingId: "b-hostel",
      buildingName: "Student Hostel",
      resourceType: "WATER",
    });

    const anomalies = detectResourceAnomalies(points, 7);
    expect(anomalies.length).toBeGreaterThan(0);
    const lastAnomaly = anomalies[anomalies.length - 1];
    expect(lastAnomaly.severity).toBe("CRITICAL");
    expect(lastAnomaly.deviationPct).toBeGreaterThan(80);
    expect(lastAnomaly.explanation).toContain("plumbing defect");
  });

  it("detects elevated weekend energy consumption", () => {
    const points: DataPoint[] = [];
    // Start on a Monday
    const monday = new Date("2025-01-06T12:00:00Z");

    for (let i = 0; i < 14; i++) {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      points.push({
        date: d,
        value: 1500,
        buildingId: "b-sci",
        buildingName: "Science Labs",
        resourceType: "ELECTRICITY",
      });
    }

    // Weekend spike on Saturday
    const sat = new Date("2025-01-25T12:00:00Z"); // Saturday
    points.push({
      date: sat,
      value: 2300, // +53%
      buildingId: "b-sci",
      buildingName: "Science Labs",
      resourceType: "ELECTRICITY",
    });

    const anomalies = detectResourceAnomalies(points, 7);
    expect(anomalies.length).toBeGreaterThan(0);
    const satAnomaly = anomalies.find((a) => a.date.getTime() === sat.getTime());
    expect(satAnomaly).toBeDefined();
    expect(satAnomaly?.severity).toBe("HIGH");
  });
});

describe("Predictive Forecasting Engine", () => {
  it("rejects forecast when fewer than 7 days of historical observations exist", () => {
    const sparseHistory: HistoricalObservation[] = [
      { date: new Date("2025-01-01"), value: 100 },
      { date: new Date("2025-01-02"), value: 110 },
    ];
    const res = generate7DayForecast(sparseHistory, "WATER", "L");
    expect(res.isSufficientData).toBe(false);
    expect(res.forecasts).toHaveLength(0);
    expect(res.message).toContain("Insufficient");
  });

  it("generates 7 continuous future days with confidence bands when data is sufficient", () => {
    const history: HistoricalObservation[] = [];
    const start = new Date("2025-01-01");
    for (let i = 0; i < 30; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      // upward trend
      history.push({ date: d, value: 500 + i * 5 });
    }

    const res = generate7DayForecast(history, "ELECTRICITY", "kWh");
    expect(res.isSufficientData).toBe(true);
    expect(res.forecasts).toHaveLength(7);
    res.forecasts.forEach((f) => {
      expect(f.predictedValue).toBeGreaterThan(0);
      expect(f.confidenceLower).toBeLessThanOrEqual(f.predictedValue);
      expect(f.confidenceUpper).toBeGreaterThanOrEqual(f.predictedValue);
    });
  });
});

describe("Sustainability Score Engine", () => {
  it("produces an explainable score and letter grade", () => {
    const score = calculateSustainabilityScore({
      totalElectricityKwh: 35000,
      totalWaterLitres: 450000,
      totalWasteKg: 3000,
      recycledWasteKg: 1200,
      compostedWasteKg: 600,
      totalCarbonKgCo2e: 15000,
      totalOccupancy: 1500,
      daysInPeriod: 30,
    });

    expect(score.overallScore).toBeGreaterThan(0);
    expect(score.overallScore).toBeLessThanOrEqual(100);
    expect(["A+", "A", "B", "C", "D", "F"]).toContain(score.letterGrade);
    expect(score.benchmarkNotes.length).toBe(5);
  });
});

describe("What-If Sustainability Simulator", () => {
  it("calculates accurate projected savings for hypothetical reductions", () => {
    const baseline: BaselineData = {
      electricityKwh: 100000,
      waterLitres: 1000000,
      wasteTotalKg: 5000,
      wasteRecycledKg: 1500,
      wasteCompostedKg: 500,
      wasteLandfillKg: 3000,
      wasteOtherKg: 0,
      electricityTariffPerKwh: 0.15,
      waterTariffPerThousandL: 3.0,
    };

    const sim = runWhatIfSimulation(baseline, {
      electricityReductionPct: 10, // -10% electricity
      waterReductionPct: 15,       // -15% water
      recyclingIncreasePct: 20,     // +20% diversion from landfill
    });

    expect(sim.electricitySavedKwh).toBe(10000);
    expect(sim.projectedElectricityKwh).toBe(90000);
    expect(sim.waterSavedLitres).toBe(150000);
    expect(sim.projectedWaterLitres).toBe(850000);
    expect(sim.wasteDivertedKg).toBe(600); // 3000 * 0.20
    expect(sim.carbonSavedKgCo2e).toBeGreaterThan(0);
    // Cost savings: 10000 * 0.15 ($1500) + 150000 * $0.003 ($450) = $1950
    expect(sim.estimatedFinancialSavingsUsd).toBe(1950);
    expect(sim.isSimulated).toBe(true);
  });
});

describe("CSV Validation and Anti-Injection Security", () => {
  it("sanitizes CSV cells starting with formula triggers", () => {
    expect(sanitizeCsvCell("=SUM(A1:A10)")).toBe("'=SUM(A1:A10)");
    expect(sanitizeCsvCell("+cmd|' /C calc'!A0")).toBe("'+cmd|' /C calc'!A0");
    expect(sanitizeCsvCell("-50")).toBe("'-50");
    expect(sanitizeCsvCell("@malicious")).toBe("'@malicious");
    expect(sanitizeCsvCell("Normal Building Name")).toBe("Normal Building Name");
  });

  it("validates valid and invalid CSV rows for resource intake", () => {
    const validCsv = `Date,Building Code,Resource Type,Quantity,Unit\n2025-01-01,MAB-01,WATER,12000,L\n2025-01-01,MAB-01,ELECTRICITY,1500,kWh`;
    const res = validateAndParseCsv(validCsv, "RESOURCE");
    expect(res.validRows).toHaveLength(2);
    expect(res.invalidRows).toHaveLength(0);

    const invalidCsv = `Date,Building Code,Resource Type,Quantity\nNotADate,MAB-01,WATER,-50\n2025-01-01,,ELECTRICITY,abc`;
    const badRes = validateAndParseCsv(invalidCsv, "RESOURCE");
    expect(badRes.invalidRows.length).toBe(2);
  });
});
