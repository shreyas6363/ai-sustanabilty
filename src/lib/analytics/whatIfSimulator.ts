import { WhatIfSimulationInput, WhatIfSimulationResult } from "@/types";
import { calculateEmissions } from "@/lib/carbon/calculator";

export interface BaselineData {
  electricityKwh: number;
  waterLitres: number;
  wasteTotalKg: number;
  wasteRecycledKg: number;
  wasteCompostedKg: number;
  wasteLandfillKg: number;
  wasteOtherKg: number;
  electricityTariffPerKwh?: number; // e.g. $0.14
  waterTariffPerThousandL?: number; // e.g. $2.50
}

export function runWhatIfSimulation(
  baseline: BaselineData,
  inputs: WhatIfSimulationInput,
  customEmissionFactors?: Record<string, number>
): WhatIfSimulationResult {
  const elecReduction = Math.max(0, Math.min(100, inputs.electricityReductionPct)) / 100;
  const waterReduction = Math.max(0, Math.min(100, inputs.waterReductionPct)) / 100;
  const recycleIncrease = Math.max(0, Math.min(100, inputs.recyclingIncreasePct)) / 100;

  // Electricity
  const baselineElectricityKwh = Number(baseline.electricityKwh.toFixed(1));
  const electricitySavedKwh = Number((baselineElectricityKwh * elecReduction).toFixed(1));
  const projectedElectricityKwh = Number((baselineElectricityKwh - electricitySavedKwh).toFixed(1));

  // Water
  const baselineWaterLitres = Number(baseline.waterLitres.toFixed(1));
  const waterSavedLitres = Number((baselineWaterLitres * waterReduction).toFixed(1));
  const projectedWaterLitres = Number((baselineWaterLitres - waterSavedLitres).toFixed(1));

  // Waste & Recycling
  const baselineWasteRecycledKg = Number(baseline.wasteRecycledKg.toFixed(1));
  // Additional diversion from landfill to recycling
  const potentialShift = baseline.wasteLandfillKg * recycleIncrease;
  const wasteDivertedKg = Number(potentialShift.toFixed(1));
  const projectedWasteRecycledKg = Number((baselineWasteRecycledKg + wasteDivertedKg).toFixed(1));
  const projectedLandfillKg = Math.max(0, Number((baseline.wasteLandfillKg - wasteDivertedKg).toFixed(1)));

  // Carbon comparison
  const baselineCarbon = calculateEmissions(
    baselineElectricityKwh,
    baselineWaterLitres,
    {
      landfillKg: baseline.wasteLandfillKg,
      compostKg: baseline.wasteCompostedKg,
      recyclingKg: baseline.wasteRecycledKg,
      otherKg: baseline.wasteOtherKg,
    },
    customEmissionFactors
  );

  const projectedCarbon = calculateEmissions(
    projectedElectricityKwh,
    projectedWaterLitres,
    {
      landfillKg: projectedLandfillKg,
      compostKg: baseline.wasteCompostedKg,
      recyclingKg: projectedWasteRecycledKg,
      otherKg: baseline.wasteOtherKg,
    },
    customEmissionFactors
  );

  const baselineCarbonKgCo2e = baselineCarbon.totalEmissionsKg;
  const projectedCarbonKgCo2e = projectedCarbon.totalEmissionsKg;
  const carbonSavedKgCo2e = Number((baselineCarbonKgCo2e - projectedCarbonKgCo2e).toFixed(2));

  // Cost estimates: conservative baseline $0.14/kWh electricity, $0.0025/L water ($2.50 per 1000L)
  const tariffElec = baseline.electricityTariffPerKwh ?? 0.14;
  const tariffWater = baseline.waterTariffPerThousandL ? baseline.waterTariffPerThousandL / 1000 : 0.0025;
  const elecCostSaved = electricitySavedKwh * tariffElec;
  const waterCostSaved = waterSavedLitres * tariffWater;
  const estimatedFinancialSavingsUsd = Number((elecCostSaved + waterCostSaved).toFixed(2));

  return {
    baselineElectricityKwh,
    projectedElectricityKwh,
    electricitySavedKwh,
    baselineWaterLitres,
    projectedWaterLitres,
    waterSavedLitres,
    baselineWasteRecycledKg,
    projectedWasteRecycledKg,
    wasteDivertedKg,
    baselineCarbonKgCo2e,
    projectedCarbonKgCo2e,
    carbonSavedKgCo2e,
    estimatedFinancialSavingsUsd,
    isSimulated: true,
  };
}
