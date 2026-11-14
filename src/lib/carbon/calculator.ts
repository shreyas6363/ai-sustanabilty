export interface EmissionFactorConfig {
  resourceType: string;
  factorValue: number;
  factorUnit: string;
  source: string;
  isDefault?: boolean;
}

// Transparent default illustrative emission factors
export const DEFAULT_EMISSION_FACTORS: Record<string, EmissionFactorConfig> = {
  ELECTRICITY: {
    resourceType: "ELECTRICITY",
    factorValue: 0.42, // kg CO2e per kWh
    factorUnit: "kg CO2e/kWh",
    source: "Illustrative Regional Grid Factor (IEA / EPA eGRID 2024 Benchmark)",
    isDefault: true,
  },
  WATER: {
    resourceType: "WATER",
    factorValue: 0.00035, // kg CO2e per Litre (pumping, treatment, municipal distribution)
    factorUnit: "kg CO2e/L",
    source: "Illustrative Municipal Water Supply & Treatment (UK DEFRA / EPA)",
    isDefault: true,
  },
  WASTE_ORGANIC: {
    resourceType: "WASTE_ORGANIC",
    factorValue: 0.06, // kg CO2e per kg
    factorUnit: "kg CO2e/kg",
    source: "Illustrative Composting & Organic Processing Factor",
    isDefault: true,
  },
  WASTE_PLASTIC: {
    resourceType: "WASTE_PLASTIC",
    factorValue: 0.09, // kg CO2e per kg
    factorUnit: "kg CO2e/kg",
    source: "Illustrative Mechanical Recycling Processing Factor",
    isDefault: true,
  },
  WASTE_LANDFILL: {
    resourceType: "WASTE_LANDFILL",
    factorValue: 0.58, // kg CO2e per kg (anaerobic methane potential)
    factorUnit: "kg CO2e/kg",
    source: "Illustrative Unsegregated Landfill Decomposition Factor",
    isDefault: true,
  },
  WASTE_GENERAL: {
    resourceType: "WASTE_GENERAL",
    factorValue: 0.45, // kg CO2e per kg
    factorUnit: "kg CO2e/kg",
    source: "Illustrative Municipal Solid Waste Mixed Average",
    isDefault: true,
  },
};

export interface CarbonBreakdown {
  electricityEmissionsKg: number;
  waterEmissionsKg: number;
  wasteEmissionsKg: number;
  totalEmissionsKg: number;
  totalEmissionsMetricTonnes: number;
  scopeBreakdown: {
    scope1Kg: number; // Direct emissions (e.g. on-site fuel/waste if any)
    scope2Kg: number; // Purchased electricity
    scope3Kg: number; // Municipal water supply and waste lifecycle
  };
  disclaimer: string;
}

export function calculateEmissions(
  electricityKwh: number,
  waterLitres: number,
  wasteKgByMethod: {
    landfillKg: number;
    compostKg: number;
    recyclingKg: number;
    otherKg: number;
  },
  customFactors?: Record<string, number>
): CarbonBreakdown {
  const electricityFactor =
    customFactors?.ELECTRICITY ?? DEFAULT_EMISSION_FACTORS.ELECTRICITY.factorValue;
  const waterFactor =
    customFactors?.WATER ?? DEFAULT_EMISSION_FACTORS.WATER.factorValue;
  const landfillFactor =
    customFactors?.WASTE_LANDFILL ?? DEFAULT_EMISSION_FACTORS.WASTE_LANDFILL.factorValue;
  const compostFactor =
    customFactors?.WASTE_ORGANIC ?? DEFAULT_EMISSION_FACTORS.WASTE_ORGANIC.factorValue;
  const recyclingFactor =
    customFactors?.WASTE_PLASTIC ?? DEFAULT_EMISSION_FACTORS.WASTE_PLASTIC.factorValue;
  const generalWasteFactor =
    customFactors?.WASTE_GENERAL ?? DEFAULT_EMISSION_FACTORS.WASTE_GENERAL.factorValue;

  const electricityEmissionsKg = Number((electricityKwh * electricityFactor).toFixed(2));
  const waterEmissionsKg = Number((waterLitres * waterFactor).toFixed(2));
  
  const wasteEmissionsKg = Number(
    (
      wasteKgByMethod.landfillKg * landfillFactor +
      wasteKgByMethod.compostKg * compostFactor +
      wasteKgByMethod.recyclingKg * recyclingFactor +
      wasteKgByMethod.otherKg * generalWasteFactor
    ).toFixed(2)
  );

  const totalEmissionsKg = Number(
    (electricityEmissionsKg + waterEmissionsKg + wasteEmissionsKg).toFixed(2)
  );

  const totalEmissionsMetricTonnes = Number((totalEmissionsKg / 1000).toFixed(3));

  return {
    electricityEmissionsKg,
    waterEmissionsKg,
    wasteEmissionsKg,
    totalEmissionsKg,
    totalEmissionsMetricTonnes,
    scopeBreakdown: {
      scope1Kg: 0,
      scope2Kg: electricityEmissionsKg,
      scope3Kg: Number((waterEmissionsKg + wasteEmissionsKg).toFixed(2)),
    },
    disclaimer:
      "Carbon emissions are transparent estimates computed as [Activity Data × Configured Emission Factor]. Values depend on input accuracy and regional grid factors.",
  };
}
