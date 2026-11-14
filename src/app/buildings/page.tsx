"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import {
  Building2,
  Plus,
  Users,
  Maximize2,
  Clock,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  X,
} from "lucide-react";
import { formatNumber } from "@/lib/utils/cn";

export default function BuildingsPage() {
  const [buildings, setBuildings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Building Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [location, setLocation] = useState("");
  const [areaSqFt, setAreaSqFt] = useState("");
  const [occupancy, setOccupancy] = useState("");
  const [schedule, setSchedule] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadBuildings = () => {
    setLoading(true);
    fetch("/api/buildings")
      .then((res) => res.json())
      .then((data) => setBuildings(data.buildings || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBuildings();
  }, []);

  const handleCreateBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/buildings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          code,
          location,
          areaSqFt: areaSqFt ? parseFloat(areaSqFt) : null,
          occupancy: occupancy ? parseInt(occupancy, 10) : null,
          operatingSchedule: schedule || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to add building.");

      setMessage("Building registered successfully.");
      setName("");
      setCode("");
      setLocation("");
      setAreaSqFt("");
      setOccupancy("");
      setSchedule("");
      loadBuildings();
      setTimeout(() => {
        setIsModalOpen(false);
        setMessage(null);
      }, 1200);
    } catch (err: any) {
      setMessage(err.message || "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-100 text-slate-800 border border-slate-200">
              <Building2 className="w-5 h-5" />
            </div>
            Buildings & Campus Sites
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Site-level resource intensity benchmarking, operating schedules, and normalized facility metrics.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Building</span>
        </button>
      </div>

      {/* Buildings Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {buildings.map((b) => {
          const m = b.metrics90Days;
          return (
            <div
              key={b.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {b.code}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      b.status === "ACTIVE"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {b.status}
                  </span>
                </div>

                <h2 className="text-base font-bold text-slate-900">{b.name}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{b.location}</p>

                {/* Facility Info Tags */}
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-1 text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                    <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{b.areaSqFt ? `${formatNumber(b.areaSqFt)} sq.ft` : "Area unlisted"}</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{b.occupancy ? `${formatNumber(b.occupancy)} occupants` : "Occupancy unlisted"}</span>
                  </div>
                </div>

                {b.operatingSchedule && (
                  <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{b.operatingSchedule}</span>
                  </div>
                )}

                {/* Missing Data Warning */}
                {(m?.isAreaMissing || m?.isOccupancyMissing) && (
                  <div className="mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      Missing {m?.isAreaMissing ? "floor area" : "occupancy"}. Raw consumption without normalization is not an equitable efficiency comparison.
                    </span>
                  </div>
                )}

                {/* 90-Day Consumption Metrics */}
                <div className="mt-4 pt-3.5 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-slate-50">
                    <span className="text-[10px] text-slate-400 block">Electricity</span>
                    <span className="font-bold text-slate-900">{formatNumber(m?.electricityKwh || 0)}</span>
                    <span className="text-[10px] text-slate-400 block">kWh</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50">
                    <span className="text-[10px] text-slate-400 block">Water</span>
                    <span className="font-bold text-slate-900">{formatNumber(m?.waterLitres || 0)}</span>
                    <span className="text-[10px] text-slate-400 block">L</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50">
                    <span className="text-[10px] text-slate-400 block">Waste</span>
                    <span className="font-bold text-slate-900">{formatNumber(m?.wasteKg || 0)}</span>
                    <span className="text-[10px] text-slate-400 block">kg</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  {b._count?.devices || 0} Connected Meters
                </span>
                <Link
                  href={`/buildings/${b.id}`}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  Inspect Site <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Building Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-slate-700" />
                Register New Building
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {message && (
              <div
                className={`p-3 rounded-xl mb-4 text-xs font-medium ${
                  message.includes("success")
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {message}
              </div>
            )}

            <form onSubmit={handleCreateBuilding} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Building Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Life Sciences Pavilion"
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Building Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. LSP-07"
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Campus Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. East Science Precinct"
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Floor Area (sq.ft)</label>
                  <input
                    type="number"
                    value={areaSqFt}
                    onChange={(e) => setAreaSqFt(e.target.value)}
                    placeholder="e.g. 45000"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Design Occupancy</label>
                  <input
                    type="number"
                    value={occupancy}
                    onChange={(e) => setOccupancy(e.target.value)}
                    placeholder="e.g. 800"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Operating Schedule</label>
                <input
                  type="text"
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  placeholder="e.g. 08:00 - 20:00, Mon-Fri"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
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
                  disabled={submitting}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold disabled:opacity-50"
                >
                  {submitting ? "Registering..." : "Save Building"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
