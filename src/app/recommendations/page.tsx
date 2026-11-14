"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  Lightbulb,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Filter,
  Building2,
  ArrowRight,
  TrendingDown,
  Info,
  Edit3,
} from "lucide-react";

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  // Status Change Modal
  const [activeRec, setActiveRec] = useState<any>(null);
  const [newStatus, setNewStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadRecommendations = () => {
    setLoading(true);
    const query = new URLSearchParams({
      category: selectedCategory,
      status: selectedStatus,
    });

    fetch(`/api/recommendations?${query.toString()}`)
      .then((res) => res.json())
      .then((data) => setRecommendations(data.recommendations || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRecommendations();
  }, [selectedCategory, selectedStatus]);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRec) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/recommendations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeRec.id,
          status: newStatus,
          implementationNotes: notes,
        }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      loadRecommendations();
      setActiveRec(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      {/* Title & Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60">
              <Lightbulb className="w-5 h-5" />
            </div>
            Sustainability Action Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Data-backed recommendations prioritized by environmental severity and projected efficiency returns.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2.5 bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-1 px-2 text-xs font-medium text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Filter:</span>
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700"
          >
            <option value="ALL">All Categories</option>
            <option value="WATER">Water</option>
            <option value="ENERGY">Energy</option>
            <option value="WASTE">Waste</option>
            <option value="CARBON">Carbon</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="PROPOSED">Proposed</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="DISMISSED">Dismissed</option>
          </select>
        </div>
      </div>

      {/* Notice */}
      <div className="p-3.5 rounded-xl bg-slate-900 text-slate-200 text-xs flex items-center gap-3 border border-slate-800">
        <Info className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>
          <strong>Action Tracking Rule:</strong> Projected savings reflect mathematical estimates until physical verification post-implementation.
        </span>
      </div>

      {/* Recommendations Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {recommendations.map((rec) => {
          let priorityColor = "bg-slate-100 text-slate-700 border-slate-200";
          if (rec.priority === "CRITICAL") priorityColor = "bg-rose-100 text-rose-800 border-rose-200";
          else if (rec.priority === "HIGH") priorityColor = "bg-amber-100 text-amber-800 border-amber-200";
          else if (rec.priority === "MEDIUM") priorityColor = "bg-blue-100 text-blue-800 border-blue-200";

          let statusBadge = "bg-slate-100 text-slate-600";
          if (rec.status === "COMPLETED") statusBadge = "bg-emerald-100 text-emerald-800 border-emerald-200";
          else if (rec.status === "IN_PROGRESS") statusBadge = "bg-blue-100 text-blue-800 border-blue-200";
          else if (rec.status === "ACCEPTED") statusBadge = "bg-teal-100 text-teal-800 border-teal-200";
          else if (rec.status === "DISMISSED") statusBadge = "bg-rose-100 text-rose-800 border-rose-200";

          return (
            <div
              key={rec.id}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                {/* Badges */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-slate-100 text-slate-700">
                      {rec.category}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${priorityColor}`}>
                      {rec.priority} Priority
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${statusBadge}`}>
                    {rec.status.replace("_", " ")}
                  </span>
                </div>

                <h2 className="text-sm font-bold text-slate-900 leading-snug">{rec.title}</h2>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">{rec.description}</p>

                {/* Evidence Box */}
                <div className="mt-3.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                  <div className="font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                    <Info className="w-3.5 h-3.5 text-slate-400" />
                    Telemetric Evidence:
                  </div>
                  <p className="text-slate-600 italic">{rec.evidence}</p>
                </div>

                {/* Recommended Action */}
                <div className="mt-3 text-xs">
                  <span className="font-semibold text-slate-800">Action Plan: </span>
                  <span className="text-slate-600">{rec.recommendedAction}</span>
                </div>

                {/* Estimated Benefit */}
                {rec.estimatedBenefit && (
                  <div className="mt-2.5 text-xs text-emerald-700 font-medium flex items-start gap-1.5">
                    <TrendingDown className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{rec.estimatedBenefit}</span>
                  </div>
                )}

                {/* Implementation Notes if any */}
                {rec.implementationNotes && (
                  <div className="mt-3 text-[11px] p-2 rounded-lg bg-emerald-50/70 border border-emerald-100 text-emerald-900">
                    <strong>Facility Note:</strong> {rec.implementationNotes}
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{rec.building ? `${rec.building.name} (${rec.building.code})` : "Campus-wide"}</span>
                </div>

                <button
                  onClick={() => {
                    setActiveRec(rec);
                    setNewStatus(rec.status);
                    setNotes(rec.implementationNotes || "");
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Update Status</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Update Modal */}
      {activeRec && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h2 className="text-base font-bold text-slate-900 mb-1">Update Recommendation</h2>
            <p className="text-xs text-slate-500 mb-4">{activeRec.title}</p>

            <form onSubmit={handleUpdateStatus} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  <option value="PROPOSED">Proposed (Pending Review)</option>
                  <option value="ACCEPTED">Accepted (Approved for Implementation)</option>
                  <option value="IN_PROGRESS">In Progress (Execution underway)</option>
                  <option value="COMPLETED">Completed (Action landed)</option>
                  <option value="DISMISSED">Dismissed (Not feasible / Rejected)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Implementation Notes / Reason</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Record work orders, contractor details, or dismissal rationale..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveRec(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold disabled:opacity-50"
                >
                  {submitting ? "Updating..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
