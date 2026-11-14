"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import {
  Droplets,
  Zap,
  Recycle,
  Globe2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Building2,
  Filter,
  ArrowRight,
  Info,
  Award,
  Sparkles,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { formatNumber, formatPercent } from "@/lib/utils/cn";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBuilding, setSelectedBuilding] = useState("ALL");
  const [selectedDays, setSelectedDays] = useState("90");
  const [buildingsList, setBuildingsList] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/buildings")
      .then((res) => res.json())
      .then((res) => setBuildingsList(res.buildings || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const query = new URLSearchParams({
      days: selectedDays,
      buildingId: selectedBuilding,
    });

    fetch(`/api/dashboard?${query.toString()}`)
      .then((res) => res.json())
      .then((res) => setData(res))
      .catch((err) => console.error("Error fetching dashboard:", err))
      .finally(() => setLoading(false));
  }, [selectedBuilding, selectedDays]);

  const kpis = data?.kpis;
  const score = kpis?.sustainabilityScore;

  const WASTE_COLORS = ["#10b981", "#059669", "#047857", "#065f46", "#34d399", "#6ee7b7", "#94a3b8", "#64748b"];

  return (
    <AppShell>
      {/* Top Banner & Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            Sustainability Command Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time monitoring, AI forecasting, and cross-resource optimization across campus.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2.5 bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-1.5 px-2 text-xs font-medium text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Filter:</span>
          </div>

          <select
            value={selectedBuilding}
            onChange={(e) => setSelectedBuilding(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">All Campus Buildings</option>
            {buildingsList.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>

          <select
            value={selectedDays}
            onChange={(e) => setSelectedDays(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="30">Past 30 Days</option>
            <option value="60">Past 60 Days</option>
            <option value="90">Past 90 Days</option>
          </select>
        </div>
      </div>

      {/* Anomaly & Recommendation Alert Banners */}
      {data?.openAnomaliesCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                Active Operational Anomalies Detected
              </h2>
              <p className="text-xs text-amber-800 mt-0.5">
                {data.openAnomaliesCount} resource deviations flagged (including high weekend draws and potential leakage).
              </p>
            </div>
          </div>
          <Link
            href="/alerts"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 transition-colors"
          >
            Investigate Anomalies
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Water KPI */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Water Consumption</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Droplets className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-900">
              {formatNumber(kpis?.water?.totalLitres || 0)} <span className="text-sm font-medium text-slate-500">L</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Daily Avg: <span className="font-semibold text-slate-700">{formatNumber(kpis?.water?.dailyAverageLitres || 0)} L/day</span>
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">vs Prior Window</span>
            <span
              className={`flex items-center font-bold ${
                (kpis?.water?.changePct || 0) > 0 ? "text-rose-600" : "text-emerald-600"
              }`}
            >
              {(kpis?.water?.changePct || 0) > 0 ? (
                <TrendingUp className="w-3.5 h-3.5 mr-1" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 mr-1" />
              )}
              {formatPercent(kpis?.water?.changePct || 0)}
            </span>
          </div>
        </div>

        {/* 2. Energy KPI */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Electricity Usage</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-900">
              {formatNumber(kpis?.energy?.totalKwh || 0)} <span className="text-sm font-medium text-slate-500">kWh</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Daily Avg: <span className="font-semibold text-slate-700">{formatNumber(kpis?.energy?.dailyAverageKwh || 0)} kWh/day</span>
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">vs Prior Window</span>
            <span
              className={`flex items-center font-bold ${
                (kpis?.energy?.changePct || 0) > 0 ? "text-rose-600" : "text-emerald-600"
              }`}
            >
              {(kpis?.energy?.changePct || 0) > 0 ? (
                <TrendingUp className="w-3.5 h-3.5 mr-1" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 mr-1" />
              )}
              {formatPercent(kpis?.energy?.changePct || 0)}
            </span>
          </div>
        </div>

        {/* 3. Waste KPI */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Waste Generated</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <Recycle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-900">
              {formatNumber(kpis?.waste?.totalKg || 0)} <span className="text-sm font-medium text-slate-500">kg</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Diversion Rate: <span className="font-semibold text-emerald-600">{kpis?.waste?.recyclingRatePct || 0}%</span>
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">Recycled / Compost</span>
            <span className="font-bold text-slate-800">
              {formatNumber((kpis?.waste?.recycledKg || 0) + (kpis?.waste?.compostKg || 0))} kg
            </span>
          </div>
        </div>

        {/* 4. Carbon Footprint KPI */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Carbon Footprint</span>
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600 border border-teal-100">
              <Globe2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-900">
              {kpis?.carbon?.totalMetricTonnes || 0} <span className="text-sm font-medium text-slate-500">t CO2e</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Estimated: <span className="font-semibold text-slate-700">{formatNumber(kpis?.carbon?.totalKgCo2e || 0)} kg CO2e</span>
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">Grid + Waste</span>
            <span
              className={`flex items-center font-bold ${
                (kpis?.carbon?.changePct || 0) > 0 ? "text-rose-600" : "text-emerald-600"
              }`}
            >
              {formatPercent(kpis?.carbon?.changePct || 0)}
            </span>
          </div>
        </div>

        {/* 5. Sustainability Score Card */}
        <div className="bg-gradient-to-br from-emerald-900 to-slate-900 text-white p-5 rounded-2xl border border-emerald-800/50 shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-300">Sustainability Score</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center justify-center font-extrabold text-sm">
              {score?.letterGrade || "B"}
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {score?.overallScore || 0} <span className="text-sm font-normal text-emerald-300">/ 100</span>
            </div>
            <p className="text-[11px] text-emerald-200 mt-1">
              Calculated across 4 normalized indicators
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-emerald-800/60 flex items-center justify-between text-[11px]">
            <span className="text-slate-300">Performance</span>
            <span className="font-semibold text-emerald-300">
              {score?.overallScore >= 80 ? "High Performance" : "Good Stewardship"}
            </span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Time-Series Resource Trend (2 cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Resource Consumption Trend</h2>
              <p className="text-xs text-slate-500">
                Daily electricity (kWh) and water draw (1000s Litres) over the evaluation window
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                Electricity (kWh)
              </span>
              <span className="flex items-center gap-1.5 font-medium text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                Water (kL)
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data?.timeSeries?.map((t: any) => ({
                  ...t,
                  waterKiloLitres: Number((t.water / 1000).toFixed(1)),
                })) || []}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorElec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorWater" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} minTickGap={30} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "none",
                    borderRadius: "0.75rem",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="electricity"
                  name="Electricity (kWh)"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorElec)"
                />
                <Area
                  type="monotone"
                  dataKey="waterKiloLitres"
                  name="Water (kL)"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorWater)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Waste Composition Breakdown (1 col) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Waste Stream Composition</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Breakdown by material category (kg)
            </p>
          </div>

          <div className="h-56 w-full my-auto flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.wasteComposition || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {(data?.wasteComposition || []).map((_: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={WASTE_COLORS[index % WASTE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "none",
                    borderRadius: "0.75rem",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                  formatter={(val: any) => [`${formatNumber(Number(val))} kg`, "Waste"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] pt-3 border-t border-slate-100">
            {(data?.wasteComposition || []).slice(0, 4).map((w: any, idx: number) => (
              <div key={w.name} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: WASTE_COLORS[idx % WASTE_COLORS.length] }}
                ></span>
                <span className="text-slate-600 truncate">{w.name}:</span>
                <span className="font-semibold text-slate-900 ml-auto">{formatNumber(w.value)} kg</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Building Performance Ranking & What-If Teaser */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Buildings Ranking (2 cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Building Performance Ranking</h2>
              <p className="text-xs text-slate-500">
                Resource draw aggregated across campus facilities with intensity metrics
              </p>
            </div>
            <Link
              href="/buildings"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              View Sites <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-y border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Building</th>
                  <th className="py-2.5 px-3">Electricity</th>
                  <th className="py-2.5 px-3">Water</th>
                  <th className="py-2.5 px-3">Waste</th>
                  <th className="py-2.5 px-3">Intensity (kWh/sq.ft)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.topBuildings || []).map((b: any) => {
                  const intensity = b.areaSqFt ? (b.electricityKwh / b.areaSqFt).toFixed(2) : "N/A";
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-900 flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{b.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono px-1 rounded bg-slate-100">
                          {b.code}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-700">
                        {formatNumber(b.electricityKwh)} kWh
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-700">
                        {formatNumber(b.waterLitres)} L
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-700">
                        {formatNumber(b.wasteKg)} kg
                      </td>
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-700">
                        {intensity} {intensity !== "N/A" && <span className="text-slate-400">kWh/sq.ft</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick AI & What-if Innovation Teaser Card (1 col) */}
        <div className="bg-gradient-to-br from-slate-900 to-emerald-950 text-white p-6 rounded-2xl border border-slate-800 shadow-md flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-3 border border-emerald-400/20">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              AI Advisor & Simulation
            </div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Test Sustainability Scenarios
            </h2>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              What if electricity usage dropped by 10%? What if cafeteria composting diverted 25 tonnes from landfill? Experiment with our interactive simulator or consult the EcoPulse AI Advisor.
            </p>
          </div>

          <div className="space-y-2 mt-6">
            <Link
              href="/simulator"
              className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-between transition-colors shadow-sm"
            >
              <span>Open What-If Simulator</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/ai-insights"
              className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-between transition-colors border border-slate-700"
            >
              <span>Ask EcoPulse AI Advisor</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
