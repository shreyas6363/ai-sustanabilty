"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  SlidersHorizontal,
  Zap,
  Droplets,
  Recycle,
  Globe2,
  DollarSign,
  TrendingDown,
  Info,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { formatNumber } from "@/lib/utils/cn";

export default function SimulatorPage() {
  const [elecReduction, setElecReduction] = useState(10); // 10%
  const [waterReduction, setWaterReduction] = useState(15); // 15%
  const [recycleIncrease, setRecycleIncrease] = useState(25); // 25%

  const [simulationData, setSimulationData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runSimulation = () => {
    setLoading(true);
    fetch("/api/simulator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        electricityReductionPct: elecReduction,
        waterReductionPct: waterReduction,
        recyclingIncreasePct: recycleIncrease,
        days: 90,
      }),
    })
      .then((res) => res.json())
      .then((data) => setSimulationData(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    runSimulation();
  }, [elecReduction, waterReduction, recycleIncrease]);

  const sim = simulationData?.simulation;
  const baseline = simulationData?.baseline;

  return (
    <AppShell>
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-md shadow-emerald-950/20">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            What-If Sustainability Simulator
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Experiment with hypothetical efficiency interventions and model their projected carbon, resource, and financial impact.
          </p>
        </div>

        <button
          onClick={() => {
            setElecReduction(10);
            setWaterReduction(15);
            setRecycleIncrease(25);
          }}
          className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
          <span>Reset Defaults</span>
        </button>
      </div>

      {/* Mandatory Disclaimer */}
      <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-start gap-3 shadow-2xs">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Simulation Disclaimer:</strong> All projected reductions and financial savings are hypothetical simulations computed using actual campus baseline telemetry and regional tariff estimates ($0.14/kWh electricity, $2.50/kL water). These results model potential outcomes and do not represent realized savings.
        </p>
      </div>

      {/* Simulator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Column (1 col) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
            Simulation Parameters
          </h2>

          {/* Slider 1: Electricity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                Electricity Reduction:
              </span>
              <span className="font-bold text-amber-600 text-sm">{elecReduction}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="1"
              value={elecReduction}
              onChange={(e) => setElecReduction(parseInt(e.target.value, 10))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0% (Status Quo)</span>
              <span>-25%</span>
              <span>-50% (Deep Retrofit)</span>
            </div>
          </div>

          {/* Slider 2: Water */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5 text-blue-500" />
                Water Conservation:
              </span>
              <span className="font-bold text-blue-600 text-sm">{waterReduction}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="1"
              value={waterReduction}
              onChange={(e) => setWaterReduction(parseInt(e.target.value, 10))}
              className="w-full accent-blue-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0% (Status Quo)</span>
              <span>-25%</span>
              <span>-50% (Fixture Upgrades)</span>
            </div>
          </div>

          {/* Slider 3: Recycling */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Recycle className="w-3.5 h-3.5 text-emerald-500" />
                Landfill Waste Diversion:
              </span>
              <span className="font-bold text-emerald-600 text-sm">+{recycleIncrease}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="60"
              step="5"
              value={recycleIncrease}
              onChange={(e) => setRecycleIncrease(parseInt(e.target.value, 10))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0% (Status Quo)</span>
              <span>+30%</span>
              <span>+60% (Zero-Waste Target)</span>
            </div>
          </div>
        </div>

        {/* Projected Impact Dashboard (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Big Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Carbon Avoidance */}
            <div className="bg-gradient-to-br from-emerald-900 to-slate-900 text-white p-6 rounded-2xl border border-emerald-800 shadow-md flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                  <Globe2 className="w-4 h-4 text-emerald-400" />
                  Projected Carbon Avoidance
                </span>
                <div className="text-3xl font-extrabold text-white mt-3">
                  {formatNumber(sim?.carbonSavedKgCo2e || 0)} <span className="text-sm font-normal text-emerald-300">kg CO2e</span>
                </div>
                <p className="text-xs text-emerald-200 mt-1">
                  ~{(Number(sim?.carbonSavedKgCo2e || 0) / 1000).toFixed(2)} metric tonnes avoided over 90 days
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-emerald-800/60 text-xs text-slate-300 flex justify-between">
                <span>Baseline: {formatNumber(sim?.baselineCarbonKgCo2e || 0)} kg</span>
                <span className="text-emerald-300 font-bold">
                  Projected: {formatNumber(sim?.projectedCarbonKgCo2e || 0)} kg
                </span>
              </div>
            </div>

            {/* Financial Savings */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  Estimated Utility Cost Savings
                </span>
                <div className="text-3xl font-extrabold text-slate-900 mt-3">
                  ${formatNumber(sim?.estimatedFinancialSavingsUsd || 0)}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Based on combined power & water municipal tariffs
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
                <span>Energy: ${formatNumber((sim?.electricitySavedKwh || 0) * 0.14)}</span>
                <span>Water: ${formatNumber((sim?.waterSavedLitres || 0) * 0.0025)}</span>
              </div>
            </div>
          </div>

          {/* Detailed Resource Breakdown */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Resource Conservation Summary</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-100">
                <span className="font-semibold text-amber-900 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  Electricity Saved
                </span>
                <div className="text-xl font-bold text-amber-900 mt-2">
                  {formatNumber(sim?.electricitySavedKwh || 0)} kWh
                </div>
                <div className="text-[11px] text-amber-800/80 mt-1">
                  Projected: {formatNumber(sim?.projectedElectricityKwh || 0)} kWh
                </div>
              </div>

              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100">
                <span className="font-semibold text-blue-900 flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-blue-600" />
                  Water Conserved
                </span>
                <div className="text-xl font-bold text-blue-900 mt-2">
                  {formatNumber(sim?.waterSavedLitres || 0)} L
                </div>
                <div className="text-[11px] text-blue-800/80 mt-1">
                  Projected: {formatNumber(sim?.projectedWaterLitres || 0)} L
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100">
                <span className="font-semibold text-emerald-900 flex items-center gap-1.5">
                  <Recycle className="w-3.5 h-3.5 text-emerald-600" />
                  Waste Diverted
                </span>
                <div className="text-xl font-bold text-emerald-900 mt-2">
                  {formatNumber(sim?.wasteDivertedKg || 0)} kg
                </div>
                <div className="text-[11px] text-emerald-800/80 mt-1">
                  Recycled Total: {formatNumber(sim?.projectedWasteRecycledKg || 0)} kg
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
