export interface AdvisorContext {
  organizationName: string;
  reportingPeriod: string;
  totalWaterLitres: number;
  totalElectricityKwh: number;
  totalWasteKg: number;
  wasteRecycledPct: number;
  totalCarbonKgCo2e: number;
  sustainabilityScore: number;
  sustainabilityGrade: string;
  buildingStats: {
    name: string;
    code: string;
    waterLitres: number;
    electricityKwh: number;
    wasteKg: number;
    areaSqFt?: number | null;
    occupancy?: number | null;
  }[];
  activeAnomalies: {
    buildingName: string;
    resourceType: string;
    severity: string;
    deviationPct: number;
    explanation: string;
  }[];
  topRecommendations: {
    title: string;
    category: string;
    priority: string;
    evidence: string;
  }[];
}

export function generateFallbackAdvice(
  question: string,
  context: AdvisorContext
): { text: string; mode: "RULE_BASED_FALLBACK" } {
  const q = question.toLowerCase();

  // 1. Highest electricity consumer
  if (q.includes("electricity") && (q.includes("most") || q.includes("highest") || q.includes("top") || q.includes("which building"))) {
    const sorted = [...context.buildingStats].sort((a, b) => b.electricityKwh - a.electricityKwh);
    if (sorted.length === 0) {
      return {
        text: "There are currently no recorded electricity records available in the database for this period.",
        mode: "RULE_BASED_FALLBACK",
      };
    }
    const top = sorted[0];
    const topShare = context.totalElectricityKwh > 0 ? ((top.electricityKwh / context.totalElectricityKwh) * 100).toFixed(1) : "0";
    const second = sorted[1];

    let reply = `### Electricity Consumption Analysis\n\n`;
    reply += `**${top.name} (${top.code})** is the highest consumer of electricity during ${context.reportingPeriod}, drawing **${top.electricityKwh.toLocaleString()} kWh** (${topShare}% of the campus total of ${context.totalElectricityKwh.toLocaleString()} kWh).\n\n`;
    if (second) {
      reply += `- Second highest: **${second.name}** at ${second.electricityKwh.toLocaleString()} kWh.\n`;
    }
    if (top.areaSqFt) {
      const intensity = (top.electricityKwh / top.areaSqFt).toFixed(2);
      reply += `- Energy Intensity: **${intensity} kWh/sq.ft** based on ${top.areaSqFt.toLocaleString()} sq.ft floor area.\n`;
    }
    reply += `\n*Recommendation:* Review HVAC chillers, server equipment, or lighting timers in ${top.name} to optimize schedule adherence.`;
    return { text: reply, mode: "RULE_BASED_FALLBACK" };
  }

  // 2. Highest water consumer
  if (q.includes("water") && (q.includes("most") || q.includes("highest") || q.includes("top") || q.includes("which building"))) {
    const sorted = [...context.buildingStats].sort((a, b) => b.waterLitres - a.waterLitres);
    if (sorted.length === 0) {
      return {
        text: "There are currently no recorded water consumption records available in the database.",
        mode: "RULE_BASED_FALLBACK",
      };
    }
    const top = sorted[0];
    const topShare = context.totalWaterLitres > 0 ? ((top.waterLitres / context.totalWaterLitres) * 100).toFixed(1) : "0";

    let reply = `### Water Consumption Analysis\n\n`;
    reply += `**${top.name} (${top.code})** records the largest water volume on campus, consuming **${top.waterLitres.toLocaleString()} Litres** (${topShare}% of total ${context.totalWaterLitres.toLocaleString()} L).\n\n`;
    if (top.occupancy) {
      reply += `- Per Capita Draw: **${(top.waterLitres / top.occupancy).toFixed(1)} L/person** for ${top.occupancy} occupants.\n`;
    }
    reply += `\n*Action item:* Inspect continuous flush valves, kitchen/cooling-tower makeup lines, and sub-meter distribution branches.`;
    return { text: reply, mode: "RULE_BASED_FALLBACK" };
  }

  // 3. Why did water or energy increase / Anomalies
  if (q.includes("why") || q.includes("increase") || q.includes("anomaly") || q.includes("leak") || q.includes("spike")) {
    if (context.activeAnomalies.length > 0) {
      let reply = `### Active Operational Anomalies & Consumption Surge Drivers\n\n`;
      reply += `The system detected **${context.activeAnomalies.length} active consumption anomalies** requiring facility review:\n\n`;
      context.activeAnomalies.forEach((a, i) => {
        reply += `${i + 1}. **${a.buildingName}** (${a.resourceType} - ${a.severity} Severity): Recorded a **+${a.deviationPct}% deviation** above historical baseline. *${a.explanation}*\n`;
      });
      reply += `\n*Operational Guidance:* Inspect mechanical rooms and check for off-schedule operations during unoccupied hours.`;
      return { text: reply, mode: "RULE_BASED_FALLBACK" };
    } else {
      return {
        text: `### Baseline Stability\n\nNo critical or high-severity anomalies are currently flagged in the database. Resource consumption over the recent period has tracked within the 1.5 standard deviation historical baseline.`,
        mode: "RULE_BASED_FALLBACK",
      };
    }
  }

  // 4. Waste management questions
  if (q.includes("waste") || q.includes("recycl") || q.includes("compost")) {
    let reply = `### Waste & Recycling Overview\n\n`;
    reply += `- Total Waste Generated: **${context.totalWasteKg.toLocaleString()} kg**\n`;
    reply += `- Current Recycling / Diversion Rate: **${context.wasteRecycledPct.toFixed(1)}%**\n\n`;
    if (context.wasteRecycledPct < 35) {
      reply += `⚠️ **Key Bottleneck:** Diversion rate is currently below the campus 45% target. High volume of recyclables (plastic, paper, cans) continues to be deposited in general residual waste streams.\n\n`;
      reply += `*Action:* Deploy color-coded dual bins across high-traffic corridors and establish organic composting at the cafeteria.`;
    } else {
      reply += `✅ **Performance Status:** Diversion rate is meeting current targets. Maintain contamination audits in science and dormitory collection points.`;
    }
    return { text: reply, mode: "RULE_BASED_FALLBACK" };
  }

  // 5. Score and performance
  if (q.includes("score") || q.includes("performance") || q.includes("grade") || q.includes("rating")) {
    let reply = `### Sustainability Intelligence Score\n\n`;
    reply += `Overall Campus Score: **${context.sustainabilityScore.toFixed(1)} / 100** (Grade: **${context.sustainabilityGrade}**)\n\n`;
    reply += `This score is mathematically computed across 4 transparent pillars:\n`;
    reply += `- **Water Efficiency (30% weight)**\n`;
    reply += `- **Electricity Intensity (35% weight)**\n`;
    reply += `- **Waste Diversion & Segregation (20% weight)**\n`;
    reply += `- **Carbon Emissions per Capita (15% weight)**\n\n`;
    reply += `*Note:* This rating represents an explainable internal benchmark rather than an external regulatory certification.`;
    return { text: reply, mode: "RULE_BASED_FALLBACK" };
  }

  // 6. Recommendations / actions
  if (q.includes("action") || q.includes("recommend") || q.includes("reduce") || q.includes("save") || q.includes("improve")) {
    if (context.topRecommendations.length > 0) {
      let reply = `### Priority Sustainability Recommendations\n\n`;
      context.topRecommendations.slice(0, 4).forEach((r, idx) => {
        reply += `${idx + 1}. **${r.title}** [${r.category} - ${r.priority} Priority]\n`;
        reply += `   *Evidence:* ${r.evidence}\n`;
      });
      reply += `\nTrack implementation status in the **Recommendations** module.`;
      return { text: reply, mode: "RULE_BASED_FALLBACK" };
    }
  }

  // General Summary Fallback
  let reply = `### EcoPulse Sustainability Summary for ${context.organizationName}\n\n`;
  reply += `Reporting Period: **${context.reportingPeriod}**\n\n`;
  reply += `| Resource Dimension | Measured Consumption | Campus Metric |\n`;
  reply += `| :--- | :--- | :--- |\n`;
  reply += `| 💧 **Water** | ${context.totalWaterLitres.toLocaleString()} Litres | Active Monitoring |\n`;
  reply += `| ⚡ **Electricity** | ${context.totalElectricityKwh.toLocaleString()} kWh | Active Monitoring |\n`;
  reply += `| ♻️ **Waste** | ${context.totalWasteKg.toLocaleString()} kg | ${context.wasteRecycledPct.toFixed(1)}% Recycled |\n`;
  reply += `| 🌍 **Carbon Footprint** | ${context.totalCarbonKgCo2e.toLocaleString()} kg CO2e | Estimated Scope 2 & 3 |\n`;
  reply += `| 🏆 **Sustainability Score** | **${context.sustainabilityScore.toFixed(1)} / 100** | Grade ${context.sustainabilityGrade} |\n\n`;
  reply += `*Active Anomalies:* ${context.activeAnomalies.length} flagged for investigation.\n\n`;
  reply += `You can ask me specific questions like: *"Which building consumes the most electricity?"*, *"Why did water usage increase?"*, or *"How can we improve our recycling rate?"*`;

  return { text: reply, mode: "RULE_BASED_FALLBACK" };
}
