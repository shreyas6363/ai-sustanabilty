"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  Droplets,
  Plus,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Building2,
  Calendar,
  X,
  CheckCircle2,
  HelpCircle,
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
  BarChart,
  Bar,
  LineChart,
  Line,
} from "recharts";
import { formatNumber, formatPercent } from "@/lib/utils/cn";

export default function WaterPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBuilding, setSelectedBuilding] = useState("ALL");
  const [buildingsList, setBuildingsList] = useState<any[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formBuildingId, setFormBuildingId] = useState("");
  const [formQuantity, setFormQuantity] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formCategory, setFormCategory] = useState("Domestic");
  const [formNotes, setFormNotes] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    const query = new URLSearchParams({
      days: "90",
      buildingId: selectedBuilding,
    });

    fetch(`/api/water?${query.toString()}`)
      .then((res) => res.json())
      .then((res) => setData(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetch("/api/buildings")
      .then((res) => res.json())
      .then((res) => {
        setBuildingsList(res.buildings || []);
        if (res.buildings?.length > 0 && !formBuildingId) {
          setFormBuildingId(res.buildings[0].id);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadData();
  }, [selectedBuilding]);

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormMessage(null);

    try {
      const res = await fetch("/api/water", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buildingId: formBuildingId,
          quantity: parseFloat(formQuantity),
          recordedAt: new Date(formDate).toISOString(),
          category: formCategory,
          notes: formNotes,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to record consumption.");

      setFormMessage("Water record logged successfully.");
      setFormQuantity("");
      setFormNotes("");
      loadData();
      setTimeout(() => {
        setIsModalOpen(false);
        setFormMessage(null);
      }, 1200);
    } catch (err: any) {
      setFormMessage(err.message || "An error occurred.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const summary = data?.summary;
  const forecast = data?.forecast;
  const detectedAnomalies = data?.detectedAnomalies || [];
  const records = data?.records || [];

  return (
    <AppShell>
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60">
              <Droplets className="w-5 h-5" />
            </div>
            Water Intelligence
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Consumption analytics, statistical leak anomaly indicators, and 7-day predictive demand forecasting.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedBuilding}
            onChange={(e) => setSelectedBuilding(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">All Campus Buildings</option>
            {buildingsList.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Log Reading</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Total Consumption (Litres)</span>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {formatNumber(summary?.totalLitres || 0)} <span className="text-sm font-medium text-slate-400">L</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Standardized measurement in Litres</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Daily Average Demand</span>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {formatNumber(summary?.dailyAverageLitres || 0)} <span className="text-sm font-medium text-slate-400">L/day</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Across recorded evaluation window</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Forecast 7-Day Average</span>
          <div className="text-2xl font-bold text-blue-600 mt-2">
            {formatNumber(
              forecast?.forecasts?.length
                ? forecast.forecasts.reduce((acc: number, f: any) => acc + f.predictedValue, 0) /
                    forecast.forecasts.length
                : 0
            )}{" "}
            <span className="text-sm font-medium text-slate-400">L/day</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Weighted seasonality projection</p>
        </div>
      </div>

      {/* Anomaly Alerts Section */}
      {detectedAnomalies.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wide">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Water Anomaly & Potential Leakage Indicators</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {detectedAnomalies.slice(0, 4).map((a: any, idx: number) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80 text-xs text-amber-950 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900">{a.buildingName}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        a.severity === "CRITICAL"
                          ? "bg-rose-100 text-rose-700 border border-rose-200"
                          : "bg-amber-100 text-amber-800 border border-amber-200"
                      }`}
                    >
                      {a.severity} (+{a.deviationPct}%)
                    </span>
                  </div>
                  <p className="text-slate-700 leading-relaxed">{a.explanation}</p>
                </div>
                <div className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-amber-200/40">
                  Observed: {formatNumber(a.observedValue)} L vs Expected Baseline: {formatNumber(a.expectedValue)} L
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7-Day Forecast & Historical Trend (Side by Side) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Historical Time-Series */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Historical Water Draw</h2>
              <p className="text-xs text-slate-500">Daily intake measured in Litres</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.timeSeries || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} minTickGap={30} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", border: "none", borderRadius: "0.75rem", color: "#fff", fontSize: "12px" }}
                  formatter={(val: any) => [`${formatNumber(Number(val))} L`, "Water"]}
                />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fill="url(#waterGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 7-Day Predictive Forecast */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-500" />
                7-Day Predictive Water Forecast
              </h2>
              <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                Statistical Model
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Projected demand using day-of-week seasonality, linear trend, and ±1.64σ confidence bounds.
            </p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={forecast?.forecasts || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="dayOfWeek" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", border: "none", borderRadius: "0.75rem", color: "#fff", fontSize: "12px" }}
                  formatter={(val: any) => [`${formatNumber(Number(val))} L`, "Projected"]}
                />
                <Bar dataKey="predictedValue" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-400">
            Method: {forecast?.method} ({forecast?.historicalDaysCount} days baseline).
          </div>
        </div>
      </div>

      {/* Recent Records Table */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <h2 className="text-sm font-bold text-slate-900 mb-3">Recent Water Consumption Records</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-y border-slate-100">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Building</th>
                <th className="py-2.5 px-3">Quantity (Litres)</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Data Source</th>
                <th className="py-2.5 px-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.slice(0, 15).map((r: any) => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 font-mono text-slate-600">
                    {new Date(r.recordedAt).toISOString().split("T")[0]}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                    {r.building?.name} ({r.building?.code})
                  </td>
                  <td className="py-2.5 px-3 font-bold text-blue-600">
                    {formatNumber(r.quantity)} L
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{r.category || "General"}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        r.dataSource === "DEMO_SIMULATION"
                          ? "bg-slate-100 text-slate-600"
                          : r.dataSource === "IOT_SENSOR"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {r.dataSource === "DEMO_SIMULATION" ? "Simulated Demo" : r.dataSource}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">{r.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Droplets className="w-5 h-5 text-blue-600" />
                Log Water Consumption
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formMessage && (
              <div
                className={`p-3 rounded-xl mb-4 text-xs font-medium flex items-center gap-2 ${
                  formMessage.includes("success")
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{formMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreateRecord} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Building</label>
                <select
                  value={formBuildingId}
                  onChange={(e) => setFormBuildingId(e.target.value)}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-1 focus:ring-blue-500"
                >
                  {buildingsList.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Water Quantity (Litres)
                </label>
                <input
                  type="number"
                  step="any"
                  value={formQuantity}
                  onChange={(e) => setFormQuantity(e.target.value)}
                  placeholder="e.g. 15000"
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reading Date</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category / Purpose</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Domestic">Domestic & Restrooms</option>
                  <option value="HVAC & Cooling">HVAC & Cooling Tower Makeup</option>
                  <option value="Kitchen & Dining">Kitchen & Dining Commons</option>
                  <option value="Laboratory">Laboratory & Research Draw</option>
                  <option value="Irrigation">Grounds & Landscape Irrigation</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Sub-meter observation or flow rate notes..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold disabled:opacity-50"
                >
                  {formSubmitting ? "Saving..." : "Save Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
