"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  Globe2,
  Factory,
  Sliders,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Info,
  Building2,
  FileText,
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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { formatNumber } from "@/lib/utils/cn";

export default function CarbonPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBuilding, setSelectedBuilding] = useState("ALL");
  const [buildingsList, setBuildingsList] = useState<any[]>([]);

  // Emission Factor Editor State
  const [editingFactor, setEditingFactor] = useState<any>(null);
  const [editValue, setEditValue] = useState("");
  const [editSource, setEditSource] = useState("");
  const [savingFactor, setSavingFactor] = useState(false);
  const [factorMessage, setFactorMessage] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    const query = new URLSearchParams({
      days: "90",
      buildingId: selectedBuilding,
    });

    fetch(`/api/carbon?${query.toString()}`)
      .then((res) => res.json())
      .then((res) => setData(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetch("/api/buildings")
      .then((res) => res.json())
      .then((res) => setBuildingsList(res.buildings || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadData();
  }, [selectedBuilding]);

  const handleUpdateFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFactor) return;
    setSavingFactor(true);
    setFactorMessage(null);

    try {
      const res = await fetch("/api/carbon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceType: editingFactor.resourceType,
          factorValue: parseFloat(editValue),
          factorUnit: editingFactor.factorUnit,
          source: editSource,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update factor.");

      setFactorMessage("Emission factor updated successfully.");
      loadData();
      setTimeout(() => {
        setEditingFactor(null);
        setFactorMessage(null);
      }, 1200);
    } catch (err: any) {
      setFactorMessage(err.message || "An error occurred.");
    } finally {
      setSavingFactor(false);
    }
  };

  const summary = data?.summary;
  const sources = data?.sources || [];
  const monthly = data?.monthlyEmissions || [];
  const buildings = data?.buildingEmissions || [];
  const factors = data?.emissionFactors || [];

  return (
    <AppShell>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600 border border-teal-200/60">
              <Globe2 className="w-5 h-5" />
            </div>
            Carbon Footprint Intelligence
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Greenhouse gas emissions inventory, Scope 2 purchased electricity & Scope 3 lifecycle calculations.
          </p>
        </div>

        <div>
          <select
            value={selectedBuilding}
            onChange={(e) => setSelectedBuilding(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 shadow-2xs focus:ring-1 focus:ring-teal-500"
          >
            <option value="ALL">All Campus Buildings</option>
            {buildingsList.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Transparent Disclaimer Box */}
      <div className="p-3.5 rounded-xl bg-slate-900 text-slate-200 text-xs flex items-start gap-3 shadow-sm border border-slate-800">
        <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Methodology & Estimation Notice:</strong> Greenhouse gas emissions are estimated using the standard formula{" "}
          <code className="text-teal-300 font-mono">[Estimated Emissions = Activity Data × Emission Factor]</code>. Illustrative regional grid and waste decomposition factors are configured below and can be updated by an administrator.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Total Estimated Carbon</span>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {summary?.totalEmissionsMetricTonnes || 0} <span className="text-sm font-medium text-slate-400">t CO2e</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {formatNumber(summary?.totalEmissionsKg || 0)} kg CO2e total
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Scope 2: Purchased Electricity</span>
          <div className="text-2xl font-bold text-emerald-600 mt-2">
            {formatNumber(summary?.scopeBreakdown?.scope2Kg || 0)} <span className="text-sm font-medium text-slate-400">kg</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Indirect power generation</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Scope 3: Waste & Water Lifecycle</span>
          <div className="text-2xl font-bold text-teal-600 mt-2">
            {formatNumber(summary?.scopeBreakdown?.scope3Kg || 0)} <span className="text-sm font-medium text-slate-400">kg</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Municipal treatment & landfill</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Direct Scope 1</span>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            0 <span className="text-sm font-medium text-slate-400">kg</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Zero on-site stationary combustion</p>
        </div>
      </div>

      {/* Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Source Contribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Emissions by Source</h2>
            <p className="text-xs text-slate-500 mt-0.5">Share of total estimated kg CO2e</p>
          </div>

          <div className="h-56 w-full my-auto flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sources}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="emissionsKg"
                >
                  {sources.map((s: any, idx: number) => (
                    <Cell key={`cell-${idx}`} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", border: "none", borderRadius: "0.75rem", color: "#fff", fontSize: "12px" }}
                  formatter={(val: any) => [`${formatNumber(Number(val))} kg CO2e`, "Emissions"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
            {sources.map((s: any) => (
              <div key={s.name} className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }}></span>
                  {s.name}
                </span>
                <span className="font-bold text-slate-900">{formatNumber(s.emissionsKg)} kg</span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Timeline */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Monthly Emissions Trajectory</h2>
              <p className="text-xs text-slate-500">Historical trend across recent months (kg CO2e)</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", border: "none", borderRadius: "0.75rem", color: "#fff", fontSize: "12px" }}
                  formatter={(val: any) => [`${formatNumber(Number(val))} kg CO2e`, "Total"]}
                />
                <Bar dataKey="totalKgCo2e" fill="#0d9488" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Configurable Emission Factors Table */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Configurable Emission Factors</h2>
            <p className="text-xs text-slate-500">
              Admin-configurable factors with transparent references.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-y border-slate-100">
              <tr>
                <th className="py-2.5 px-3">Resource Type</th>
                <th className="py-2.5 px-3">Factor Value</th>
                <th className="py-2.5 px-3">Unit</th>
                <th className="py-2.5 px-3">Reference / Source</th>
                <th className="py-2.5 px-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {factors.map((f: any) => (
                <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{f.resourceType}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-teal-700">{f.factorValue}</td>
                  <td className="py-2.5 px-3 text-slate-600 font-mono">{f.factorUnit}</td>
                  <td className="py-2.5 px-3 text-slate-500 max-w-sm truncate">{f.source}</td>
                  <td className="py-2.5 px-3">
                    <button
                      onClick={() => {
                        setEditingFactor(f);
                        setEditValue(f.factorValue.toString());
                        setEditSource(f.source);
                      }}
                      className="px-2.5 py-1 text-xs font-semibold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
                    >
                      Configure
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Factor Edit Modal */}
      {editingFactor && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h2 className="text-base font-bold text-slate-900 mb-2">
              Configure {editingFactor.resourceType} Emission Factor
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Enter the certified emission factor in {editingFactor.factorUnit}.
            </p>

            {factorMessage && (
              <div className="p-3 rounded-xl mb-4 text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                {factorMessage}
              </div>
            )}

            <form onSubmit={handleUpdateFactor} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Factor Value</label>
                <input
                  type="number"
                  step="any"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reference Citation / Source</label>
                <input
                  type="text"
                  value={editSource}
                  onChange={(e) => setEditSource(e.target.value)}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingFactor(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingFactor}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-semibold disabled:opacity-50"
                >
                  {savingFactor ? "Saving..." : "Update Factor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
