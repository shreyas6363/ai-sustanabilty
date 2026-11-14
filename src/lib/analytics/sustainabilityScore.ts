import { SustainabilityScoreBreakdown } from "@/types";

export interface ScoreInputParams {
  totalElectricityKwh: number;
  totalWaterLitres: number;
  totalWasteKg: number;
  recycledWasteKg: number;
  compostedWasteKg: number;
  totalCarbonKgCo2e: number;
  totalOccupancy: number; // campus/building population
  daysInPeriod: number;
}

export function calculateSustainabilityScore(
  params: ScoreInputParams
): SustainabilityScoreBreakdown {
  const {
    totalElectricityKwh,
    totalWaterLitres,
    totalWasteKg,
    recycledWasteKg,
    compostedWasteKg,
    totalCarbonKgCo2e,
    totalOccupancy,
    daysInPeriod,
  } = params;

  const population = Math.max(1, totalOccupancy || 1200);
  const days = Math.max(1, daysInPeriod || 30);

  // 1. Water Efficiency Score (Weight: 30%)
  // Sustainable campus benchmark: 40 - 55 L / person / day
  const dailyWaterPerPerson = totalWaterLitres / population / days;
  let waterScore = 100;
  if (dailyWaterPerPerson <= 45) {
    waterScore = 95 - (dailyWaterPerPerson / 45) * 5; // 90 - 95
  } else if (dailyWaterPerPerson <= 75) {
    waterScore = 85 - ((dailyWaterPerPerson - 45) / 30) * 20; // 65 - 85
  } else if (dailyWaterPerPerson <= 120) {
    waterScore = 65 - ((dailyWaterPerPerson - 75) / 45) * 25; // 40 - 65
  } else {
    waterScore = Math.max(20, 40 - ((dailyWaterPerPerson - 120) / 100) * 20);
  }
  waterScore = Math.min(100, Math.max(10, Number(waterScore.toFixed(1))));

  // 2. Energy Efficiency Score (Weight: 35%)
  // Sustainable benchmark: 2.5 - 4.0 kWh / person / day
  const dailyEnergyPerPerson = totalElectricityKwh / population / days;
  let energyScore = 100;
  if (dailyEnergyPerPerson <= 3.0) {
    energyScore = 96 - (dailyEnergyPerPerson / 3.0) * 6; // 90 - 96
  } else if (dailyEnergyPerPerson <= 6.0) {
    energyScore = 90 - ((dailyEnergyPerPerson - 3.0) / 3.0) * 25; // 65 - 90
  } else if (dailyEnergyPerPerson <= 10.0) {
    energyScore = 65 - ((dailyEnergyPerPerson - 6.0) / 4.0) * 25; // 40 - 65
  } else {
    energyScore = Math.max(15, 40 - ((dailyEnergyPerPerson - 10.0) / 10) * 25);
  }
  energyScore = Math.min(100, Math.max(10, Number(energyScore.toFixed(1))));

  // 3. Waste Diversion & Recycling Score (Weight: 20%)
  // Diversion rate = (Recycled + Composted) / Total Waste
  const divertedKg = recycledWasteKg + compostedWasteKg;
  const diversionRate = totalWasteKg > 0 ? (divertedKg / totalWasteKg) * 100 : 0;
  // 50%+ diversion rate is top tier
  let wasteScore = 0;
  if (diversionRate >= 60) {
    wasteScore = 95 + Math.min(5, (diversionRate - 60) * 0.125);
  } else if (diversionRate >= 40) {
    wasteScore = 80 + ((diversionRate - 40) / 20) * 15;
  } else if (diversionRate >= 20) {
    wasteScore = 60 + ((diversionRate - 20) / 20) * 20;
  } else {
    wasteScore = Math.max(15, (diversionRate / 20) * 60);
  }
  wasteScore = Math.min(100, Math.max(10, Number(wasteScore.toFixed(1))));

  // 4. Carbon Intensity Score (Weight: 15%)
  // kg CO2e per person per day. Benchmark: < 1.5 kg CO2e/person/day
  const dailyCarbonPerPerson = totalCarbonKgCo2e / population / days;
  let carbonScore = 100;
  if (dailyCarbonPerPerson <= 1.5) {
    carbonScore = 95 - (dailyCarbonPerPerson / 1.5) * 10;
  } else if (dailyCarbonPerPerson <= 3.5) {
    carbonScore = 85 - ((dailyCarbonPerPerson - 1.5) / 2.0) * 25;
  } else {
    carbonScore = Math.max(15, 60 - ((dailyCarbonPerPerson - 3.5) / 4.0) * 45);
  }
  carbonScore = Math.min(100, Math.max(10, Number(carbonScore.toFixed(1))));

  // Overall Weighted Score
  const overall =
    waterScore * 0.30 +
    energyScore * 0.35 +
    wasteScore * 0.20 +
    carbonScore * 0.15;

  const overallScore = Math.min(100, Math.max(0, Number(overall.toFixed(1))));

  let letterGrade: "A+" | "A" | "B" | "C" | "D" | "F" = "C";
  if (overallScore >= 90) letterGrade = "A+";
  else if (overallScore >= 80) letterGrade = "A";
  else if (overallScore >= 70) letterGrade = "B";
  else if (overallScore >= 60) letterGrade = "C";
  else if (overallScore >= 50) letterGrade = "D";
  else letterGrade = "F";

  const notes = [
    `Water Intensity: ${dailyWaterPerPerson.toFixed(1)} L/person/day (Score: ${waterScore}/100, weight 30%)`,
    `Electricity Intensity: ${dailyEnergyPerPerson.toFixed(1)} kWh/person/day (Score: ${energyScore}/100, weight 35%)`,
    `Waste Diversion Rate: ${diversionRate.toFixed(1)}% diverted from landfill (Score: ${wasteScore}/100, weight 20%)`,
    `Carbon Footprint Intensity: ${dailyCarbonPerPerson.toFixed(2)} kg CO2e/person/day (Score: ${carbonScore}/100, weight 15%)`,
    `Evaluation Population: ${population.toLocaleString()} occupants over ${days} recorded days`,
  ];

  return {
    overallScore,
    letterGrade,
    waterScore,
    energyScore,
    wasteScore,
    carbonScore,
    benchmarkNotes: notes,
    calculatedAt: new Date().toISOString(),
  };
}
