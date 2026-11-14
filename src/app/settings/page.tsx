"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  Settings,
  Building,
  Users,
  Shield,
  FileText,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";

export default function SettingsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [orgName, setOrgName] = useState("");
  const [orgLocation, setOrgLocation] = useState("");
  const [savingOrg, setSavingOrg] = useState(false);
  const [orgMessage, setOrgMessage] = useState<string | null>(null);

  const loadSettings = () => {
    setLoading(true);
    fetch("/api/settings")
      .then((res) => res.json())
      .then((res) => {
        setData(res.organization);
        setOrgName(res.organization?.name || "");
        setOrgLocation(res.organization?.location || "");
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingOrg(true);
    setOrgMessage(null);

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: orgName, location: orgLocation }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update settings");

      setOrgMessage("Organization profile updated.");
      loadSettings();
      setTimeout(() => setOrgMessage(null), 2000);
    } catch (err: any) {
      setOrgMessage(err.message || "An error occurred.");
    } finally {
      setSavingOrg(false);
    }
  };

  const users = data?.users || [];
  const auditLogs = data?.auditLogs || [];

  return (
    <AppShell>
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-slate-100 text-slate-800 border border-slate-200">
            <Settings className="w-5 h-5" />
          </div>
          Platform Settings & Governance
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage campus organization profiles, user permissions, audit trails, and data governance.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Organization Profile */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building className="w-4 h-4 text-emerald-600" />
            Campus Profile
          </h2>

          {orgMessage && (
            <div className="p-3 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
              {orgMessage}
            </div>
          )}

          <form onSubmit={handleSaveOrg} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Organization Name</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Campus Location</label>
              <input
                type="text"
                value={orgLocation}
                onChange={(e) => setOrgLocation(e.target.value)}
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Organization Type</label>
              <input
                type="text"
                value={data?.organizationType || "Educational Campus"}
                disabled
                className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
              />
            </div>

            <button
              type="submit"
              disabled={savingOrg}
              className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {savingOrg ? "Saving..." : "Save Profile"}
            </button>
          </form>
        </div>

        {/* User Governance */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Users className="w-4 h-4 text-blue-600" />
            Active User Roles & Access
          </h2>

          <div className="space-y-2.5">
            {users.map((u: any) => (
              <div
                key={u.id}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-slate-900">{u.name}</span>
                  <p className="text-[11px] text-slate-500">{u.email}</p>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    u.role === "ADMIN"
                      ? "bg-emerald-100 text-emerald-800"
                      : u.role === "MANAGER"
                      ? "bg-teal-100 text-teal-800"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {u.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Governance Audit Trail */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <h2 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-600" />
          Security & Telemetry Audit Trail
        </h2>
        <p className="text-xs text-slate-500 mb-3">Immutable record of data modifications and administrative events.</p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-y border-slate-100">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Entity Type</th>
                <th className="py-2.5 px-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.slice(0, 15).map((log: any) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 font-mono text-slate-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-600">{log.entityType}</td>
                  <td className="py-2.5 px-3 text-slate-700">{log.details || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
