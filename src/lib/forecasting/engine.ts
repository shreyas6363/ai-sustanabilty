export interface HistoricalObservation {
  date: Date;
  value: number;
}

export interface DayForecast {
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  predictedValue: number;
  confidenceLower: number;
  confidenceUpper: number;
}

export interface ForecastResult {
  resourceType: string;
  unit: string;
  method: string;
  isSufficientData: boolean;
  message?: string;
  historicalDaysCount: number;
  forecasts: DayForecast[];
  limitations: string;
}

export function generate7DayForecast(
  history: HistoricalObservation[],
  resourceType: "WATER" | "ELECTRICITY" | "WASTE",
  unit: string
): ForecastResult {
  if (!history || history.length < 7) {
    return {
      resourceType,
      unit,
      method: "Statistical Day-of-Week Weighted Moving Average with Trend",
      isSufficientData: false,
      message: `Insufficient historical records (received ${history?.length || 0} days, minimum 7 days required for forecasting).`,
      historicalDaysCount: history?.length || 0,
      forecasts: [],
      limitations: "Forecast cannot be generated reliably without at least 7 continuous days of historical measurements.",
    };
  }

  // Sort ascending
  const sorted = [...history].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const n = sorted.length;
  // Calculate day-of-week profile (0 to 6)
  const dowSums: Record<number, { sum: number; count: number }> = {};
  for (let i = 0; i < 7; i++) dowSums[i] = { sum: 0, count: 0 };

  for (const item of sorted) {
    const d = new Date(item.date).getDay();
    dowSums[d].sum += item.value;
    dowSums[d].count += 1;
  }

  // Overall average
  const totalSum = sorted.reduce((acc, curr) => acc + curr.value, 0);
  const globalMean = totalSum / n;

  // Day of week factors relative to mean
  const dowFactors: Record<number, number> = {};
  for (let i = 0; i < 7; i++) {
    if (dowSums[i].count > 0 && globalMean > 0) {
      dowFactors[i] = (dowSums[i].sum / dowSums[i].count) / globalMean;
    } else {
      dowFactors[i] = 1.0;
    }
  }

  // Linear trend calculation over last 21 days (or available)
  const windowSize = Math.min(n, 21);
  const recentWindow = sorted.slice(n - windowSize);
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < windowSize; i++) {
    const x = i;
    const y = recentWindow[i].value;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const denominator = windowSize * sumXX - sumX * sumX;
  const slope = denominator !== 0 ? (windowSize * sumXY - sumX * sumY) / denominator : 0;
  const intercept = (sumY - slope * sumX) / windowSize;

  // Compute residual standard deviation for confidence interval
  const residuals = recentWindow.map((pt, i) => pt.value - (intercept + slope * i));
  const residualVariance =
    residuals.reduce((acc, r) => acc + r * r, 0) / Math.max(1, windowSize - 2);
  const residualStdDev = Math.sqrt(residualVariance);

  // Generate next 7 days from the last date
  const lastDate = new Date(sorted[n - 1].date);
  const forecasts: DayForecast[] = [];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
    const targetDate = new Date(lastDate);
    targetDate.setDate(targetDate.getDate() + dayOffset);
    const dow = targetDate.getDay();

    // Trend base projection
    const xProjected = windowSize - 1 + dayOffset;
    const trendBase = Math.max(globalMean * 0.3, intercept + slope * xProjected);
    
    // Blend trend base with recent 7-day weighted moving average
    const recent7 = sorted.slice(-7);
    let weightedSum = 0;
    let weightSum = 0;
    recent7.forEach((pt, idx) => {
      const weight = idx + 1;
      weightedSum += pt.value * weight;
      weightSum += weight;
    });
    const wma = weightedSum / weightSum;

    // Combined baseline adjusted by day-of-week factor
    const combinedBase = 0.5 * trendBase + 0.5 * wma;
    const factor = dowFactors[dow] || 1.0;
    const rawPredicted = Math.max(0, combinedBase * factor);

    // Confidence interval expands slightly each day into the future (sqrt(dayOffset))
    const uncertaintyMargin = Math.max(rawPredicted * 0.08, residualStdDev * 1.64 * Math.sqrt(dayOffset / 2));
    const lower = Math.max(0, Number((rawPredicted - uncertaintyMargin).toFixed(1)));
    const upper = Number((rawPredicted + uncertaintyMargin).toFixed(1));

    forecasts.push({
      date: targetDate.toISOString().split("T")[0],
      dayOfWeek: dayNames[dow],
      predictedValue: Number(rawPredicted.toFixed(1)),
      confidenceLower: lower,
      confidenceUpper: upper,
    });
  }

  return {
    resourceType,
    unit,
    method: "Day-of-Week Seasonality with Linear Trend & Weighted Moving Average",
    isSufficientData: true,
    historicalDaysCount: n,
    forecasts,
    limitations:
      "Forecast models assume continuation of recent operational schedules and baseline conditions. Unscheduled maintenance, holidays, weather fluctuations, or facility disruptions will alter actual outcomes.",
  };
}
