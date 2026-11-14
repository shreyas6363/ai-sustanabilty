export type UserRole = "ADMIN" | "MANAGER" | "VIEWER";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId: string;
  organizationName?: string;
}

export type ResourceType = "WATER" | "ELECTRICITY";

export type WasteCategory =
  | "ORGANIC"
  | "PAPER"
  | "PLASTIC"
  | "GLASS"
  | "METAL"
  | "E_WASTE"
  | "RESIDUAL"
  | "OTHER";

export type DisposalMethod =
  | "RECYCLING"
  | "COMPOSTING"
  | "LANDFILL"
  | "INCINERATION"
  | "SPECIAL_PROCESSING";

export type DataSource =
  | "MANUAL"
  | "CSV_IMPORT"
  | "IOT_SENSOR"
  | "DEMO_SIMULATION";

export type AnomalySeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type AnomalyStatus = "OPEN" | "INVESTIGATING" | "RESOLVED" | "DISMISSED";

export type RecommendationStatus =
  | "PROPOSED"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "DISMISSED";

export type RecommendationPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface SustainabilityScoreBreakdown {
  overallScore: number; // 0 - 100
  letterGrade: "A+" | "A" | "B" | "C" | "D" | "F";
  waterScore: number;   // 0 - 100 (30% weight)
  energyScore: number;  // 0 - 100 (35% weight)
  wasteScore: number;   // 0 - 100 (20% weight)
  carbonScore: number;  // 0 - 100 (15% weight)
  benchmarkNotes: string[];
  calculatedAt: string;
}

export interface WhatIfSimulationInput {
  electricityReductionPct: number; // e.g. 10 for 10% reduction
  waterReductionPct: number;       // e.g. 15 for 15% reduction
  recyclingIncreasePct: number;     // e.g. 20 for 20% increase
}

export interface WhatIfSimulationResult {
  baselineElectricityKwh: number;
  projectedElectricityKwh: number;
  electricitySavedKwh: number;
  baselineWaterLitres: number;
  projectedWaterLitres: number;
  waterSavedLitres: number;
  baselineWasteRecycledKg: number;
  projectedWasteRecycledKg: number;
  wasteDivertedKg: number;
  baselineCarbonKgCo2e: number;
  projectedCarbonKgCo2e: number;
  carbonSavedKgCo2e: number;
  estimatedFinancialSavingsUsd: number;
  isSimulated: true;
}
