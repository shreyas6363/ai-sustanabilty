"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import {
  Building2,
  ArrowLeft,
  Zap,
  Droplets,
  Recycle,
  AlertTriangle,
  Lightbulb,
  Radio,
  Clock,
  Maximize2,
  Users,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatNumber } from "@/lib/utils/cn";

export default function BuildingDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/buildings/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Building not found");
        return res.json();
      })
      .then((res) => setData(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  const building = data?.building;
  const resources = data?.resources || [];
  const waste = data?.waste || [];

  // Transform daily series for charts
  const dailySeries: Record<string, { date: string; water: number; elec: number }> = {};
  let totalWater = 0;
  let totalElec = 0;

  for (const r of resources) {
    const d = new Date(r.recordedAt).toISOString().split("T")[0];
    if (!dailySeries[d]) dailySeries[d] = { date: d, water: 0, elec: 0 };
    if (r.resourceType === "WATER") {
      dailySeries[d].water += r.quantity;
      totalWater += r.quantity;
    } else {
      dailySeries[d].elec += r.quantity;
      totalElec += r.quantity;
    }
  }

  const chartData = Object.values(dailySeries).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <AppShell>
      {/* Back button & Title */}
      <div>
        <Link
          href="/buildings"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Buildings</span>
        </Link>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
              <span>{building?.name || "Loading Building..."}</span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                {building?.code}
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">{building?.location}</p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
              Status: <span className="text-emerald-600 font-bold">{building?.status}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Building Attributes Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div>
          <span className="text-slate-400 font-medium block">Floor Area</span>
          <span className="text-sm font-bold text-slate-800">
            {building?.areaSqFt ? `${formatNumber(building.areaSqFt)} sq.ft` : "Not provided"}
          </span>
        </div>
        <div>
          <span className="text-slate-400 font-medium block">Occupancy</span>
          <span className="text-sm font-bold text-slate-800">
            {building?.occupancy ? `${formatNumber(building.occupancy)} people` : "Not provided"}
          </span>
        </div>
        <div>
          <span className="text-slate-400 font-medium block">Operating Schedule</span>
          <span className="text-sm font-bold text-slate-800">
            {building?.operatingSchedule || "Continuous 24/7"}
          </span>
        </div>
        <div>
          <span className="text-slate-400 font-medium block">Connected Sensors</span>
          <span className="text-sm font-bold text-slate-800">
            {building?.devices?.length || 0} Telemetry Meters
          </span>
        </div>
      </div>

      {/* 90-Day Consumption Chart for this building */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <h2 className="text-sm font-bold text-slate-900 mb-1">
          Historical Resource Profile (Past 90 Days)
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Daily electricity (kWh) and water draw (Litres)
        </p>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="bElec" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="bWater" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} minTickGap={30} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", border: "none", borderRadius: "0.75rem", color: "#fff", fontSize: "12px" }}
              />
              <Area type="monotone" dataKey="elec" name="Electricity (kWh)" stroke="#f59e0b" strokeWidth={2} fill="url(#bElec)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Connected IoT Devices */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Radio className="w-4 h-4 text-emerald-600" />
          Connected IoT Telemetry Devices & Sub-Meters
        </h2>

        {building?.devices?.length === 0 ? (
          <p className="text-xs text-slate-400">No hardware sensors registered for this site.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {building?.devices?.map((d: any) => (
              <div key={d.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800">{d.deviceName}</span>
                  <div className="text-[11px] text-slate-500 mt-0.5 font-mono">{d.deviceType}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {d.deviceStatus}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    {d.isSimulated ? "Simulated Ingestion" : "Physical Sensor"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
