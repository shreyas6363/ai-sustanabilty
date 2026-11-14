"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building2,
  Check,
  Filter,
} from "lucide-react";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState("ALL");

  const loadAlerts = () => {
    setLoading(true);
    fetch("/api/alerts")
      .then((res) => res.json())
      .then((data) => setAlerts(data.alerts || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleResolveAlert = async (id: string, isResolved: boolean) => {
    try {
      await fetch("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isResolved, isRead: true }),
      });
      loadAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = alerts.filter((a) => {
    if (filterSeverity === "ALL") return true;
    return a.severity === filterSeverity;
  });

  return (
    <AppShell>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200/60">
              <Bell className="w-5 h-5" />
            </div>
            Alert & Notification Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time threshold breaches, leakage flags, and equipment baseline deviations.
          </p>
        </div>

        {/* Severity Filter */}
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-transparent font-medium text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="WARNING">Warning Only</option>
            <option value="INFO">Informational</option>
          </select>
        </div>
      </div>

      {/* Alerts Stream */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800">No active alerts</p>
            <p className="text-xs text-slate-400 mt-1">All campus telemetry is currently within baseline tolerance.</p>
          </div>
        ) : (
          filtered.map((a) => {
            let badgeStyle = "bg-slate-100 text-slate-700 border-slate-200";
            if (a.severity === "CRITICAL") badgeStyle = "bg-rose-100 text-rose-800 border-rose-200";
            else if (a.severity === "WARNING") badgeStyle = "bg-amber-100 text-amber-800 border-amber-200";

            return (
              <div
                key={a.id}
                className={`bg-white rounded-2xl p-5 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  !a.isRead ? "border-amber-300 shadow-xs bg-amber-50/20" : "border-slate-200 shadow-2xs"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      a.severity === "CRITICAL"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${badgeStyle}`}>
                        {a.severity}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 uppercase">
                        {a.category}
                      </span>
                      {a.building && (
                        <span className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          {a.building.name} ({a.building.code})
                        </span>
                      )}
                    </div>
                    <h2 className="text-sm font-bold text-slate-900">{a.title}</h2>
                    <p className="text-xs text-slate-600 mt-1">{a.message}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-2 font-mono">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(a.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {a.isResolved ? (
                    <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200">
                      <Check className="w-3.5 h-3.5" />
                      Resolved
                    </span>
                  ) : (
                    <button
                      onClick={() => handleResolveAlert(a.id, true)}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Resolve Alert</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
