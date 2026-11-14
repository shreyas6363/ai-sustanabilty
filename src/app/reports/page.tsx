"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  FileBarChart2,
  Printer,
  Download,
  Building2,
  Calendar,
  CheckCircle2,
  Globe2,
  Zap,
  Droplets,
  Recycle,
  Lightbulb,
} from "lucide-react";
import { formatNumber } from "@/lib/utils/cn";

export default function ReportsPage() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState("90");

  const loadReport = () => {
    setLoading(true);
    fetch(`/api/reports?days=${days}`)
      .then((res) => res.json())
      .then((data) => setReport(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReport();
  }, [days]);

  const kpis = report?.kpis;
  const score = kpis?.sustainabilityScore;

  return (
    <AppShell>
      {/* Controls (hidden when printing) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-100 text-slate-800 border border-slate-200">
              <FileBarChart2 className="w-5 h-5" />
            </div>
            Sustainability Executive Reports
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Certified environmental stewardship audit and performance overview.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 shadow-2xs"
          >
            <option value="30">Past 30 Days</option>
            <option value="60">Past 60 Days</option>
            <option value="90">Past 90 Days</option>
          </select>

          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Report Canvas */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-10 shadow-sm max-w-4xl mx-auto space-y-8">
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-lg tracking-tight">
              EcoPulse <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">AI</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mt-2">
              Executive Sustainability & Resource Audit
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Organization: <strong>{report?.organization?.name}</strong> • {report?.organization?.location}
            </p>
          </div>

          <div className="text-left sm:text-right text-xs text-slate-500 space-y-1">
            <div>Audit Period: <strong className="text-slate-800">{report?.reportMetadata?.reportingPeriod}</strong></div>
            <div>Generated: <strong className="text-slate-800">{new Date().toLocaleDateString()}</strong></div>
            <div className="font-mono text-[10px] text-slate-400">Auditor: {report?.reportMetadata?.generatedBy}</div>
          </div>
        </div>

        {/* Sustainability Score Highlight */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-emerald-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-sm">
          <div>
            <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">
              Comprehensive Sustainability Score
            </span>
            <div className="text-4xl font-extrabold text-white mt-1">
              {score?.overallScore || 0} <span className="text-lg font-normal text-emerald-300">/ 100</span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-md">
              Mathematically evaluated across Water Efficiency (30%), Energy Intensity (35%), Waste Diversion (20%), and Carbon Footprint (15%).
            </p>
          </div>

          <div className="text-center sm:text-right">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 flex items-center justify-center font-black text-3xl mx-auto sm:ml-auto">
              {score?.letterGrade || "B"}
            </div>
            <span className="text-xs font-bold text-emerald-300 block mt-1">Grade {score?.letterGrade}</span>
          </div>
        </div>

        {/* 4 Pillars Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-slate-500 font-semibold flex items-center gap-1.5 mb-2">
              <Droplets className="w-4 h-4 text-blue-600" /> Water Draw
            </span>
            <div className="text-xl font-bold text-slate-900">
              {formatNumber(kpis?.water?.totalLitres || 0)} L
            </div>
            <span className="text-[11px] text-slate-500 block mt-1">
              Avg: {formatNumber(kpis?.water?.dailyAverageLitres || 0)} L/day
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-slate-500 font-semibold flex items-center gap-1.5 mb-2">
              <Zap className="w-4 h-4 text-amber-600" /> Electricity
            </span>
            <div className="text-xl font-bold text-slate-900">
              {formatNumber(kpis?.electricity?.totalKwh || 0)} kWh
            </div>
            <span className="text-[11px] text-slate-500 block mt-1">
              Avg: {formatNumber(kpis?.electricity?.dailyAverageKwh || 0)} kWh/day
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-slate-500 font-semibold flex items-center gap-1.5 mb-2">
              <Recycle className="w-4 h-4 text-emerald-600" /> Waste Generated
            </span>
            <div className="text-xl font-bold text-slate-900">
              {formatNumber(kpis?.waste?.totalKg || 0)} kg
            </div>
            <span className="text-[11px] text-emerald-700 font-semibold block mt-1">
              {kpis?.waste?.diversionRatePct || 0}% Diverted
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-slate-500 font-semibold flex items-center gap-1.5 mb-2">
              <Globe2 className="w-4 h-4 text-teal-600" /> Estimated Carbon
            </span>
            <div className="text-xl font-bold text-slate-900">
              {kpis?.carbon?.totalMetricTonnes || 0} t CO2e
            </div>
            <span className="text-[11px] text-slate-500 block mt-1">
              {formatNumber(kpis?.carbon?.totalKgCo2e || 0)} kg total
            </span>
          </div>
        </div>

        {/* Priority Actions */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-emerald-600" />
            Strategic Recommended Actions
          </h3>
          <div className="space-y-2.5">
            {report?.recommendations?.slice(0, 4).map((r: any, idx: number) => (
              <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900">{r.title}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    {r.priority} Priority
                  </span>
                </div>
                <p className="text-slate-600 mt-1">{r.recommendedAction}</p>
                {r.estimatedBenefit && (
                  <p className="text-emerald-700 font-semibold text-[11px] mt-1.5">
                    Impact: {r.estimatedBenefit}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Methodology & Notes */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 space-y-1.5">
          <div className="font-bold text-slate-700">Audit Standards & Emission Notes:</div>
          <ul className="list-disc list-inside space-y-1 text-[11px]">
            {report?.methodologyNotes?.map((note: string, idx: number) => (
              <li key={idx}>{note}</li>
            ))}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
