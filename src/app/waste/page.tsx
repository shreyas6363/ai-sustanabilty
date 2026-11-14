"use client";

import { useEffect, useState, useRef } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  Recycle,
  Plus,
  Camera,
  Upload,
  AlertCircle,
  CheckCircle2,
  X,
  Sparkles,
  Info,
  Building2,
  Trash2,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { formatNumber } from "@/lib/utils/cn";

export default function WastePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBuilding, setSelectedBuilding] = useState("ALL");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [buildingsList, setBuildingsList] = useState<any[]>([]);

  // Log Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formBuildingId, setFormBuildingId] = useState("");
  const [formCategory, setFormCategory] = useState("ORGANIC");
  const [formQuantity, setFormQuantity] = useState("");
  const [formDisposal, setFormDisposal] = useState("COMPOSTING");
  const [formRecyclable, setFormRecyclable] = useState(true);
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formNotes, setFormNotes] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<string | null>(null);

  // Vision Classifier Modal
  const [isVisionOpen, setIsVisionOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [visionLoading, setVisionLoading] = useState(false);
  const [visionResult, setVisionResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = () => {
    setLoading(true);
    const query = new URLSearchParams({
      days: "90",
      buildingId: selectedBuilding,
      category: selectedCategory,
    });

    fetch(`/api/waste?${query.toString()}`)
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
  }, [selectedBuilding, selectedCategory]);

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormMessage(null);

    try {
      const res = await fetch("/api/waste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buildingId: formBuildingId,
          wasteCategory: formCategory,
          quantityKg: parseFloat(formQuantity),
          disposalMethod: formDisposal,
          recyclable: formRecyclable,
          recordedAt: new Date(formDate).toISOString(),
          notes: formNotes,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to log waste.");

      setFormMessage("Waste record logged successfully.");
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file (JPEG, PNG, WebP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
      setVisionResult(null);
    };
    reader.readAsDataURL(file);
  };

  const runVisionClassifier = async () => {
    if (!imagePreview) return;
    setVisionLoading(true);
    setVisionResult(null);

    try {
      const res = await fetch("/api/ai/classify-waste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imagePreview }),
      });

      const json = await res.json();
      setVisionResult(json);
    } catch (err) {
      console.error(err);
    } finally {
      setVisionLoading(false);
    }
  };

  const applyVisionClassification = () => {
    if (!visionResult?.suggestedCategory) return;
    setFormCategory(visionResult.suggestedCategory);
    setFormNotes(`AI Classification Suggestion: ${visionResult.notes}`);
    setIsVisionOpen(false);
    setIsModalOpen(true);
  };

  const summary = data?.summary;
  const categories = data?.categoryBreakdown || [];
  const records = data?.records || [];
  const COLORS = ["#10b981", "#059669", "#047857", "#065f46", "#34d399", "#6ee7b7", "#94a3b8", "#64748b"];

  return (
    <AppShell>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60">
              <Recycle className="w-5 h-5" />
            </div>
            Intelligent Waste Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track material streams, landfill diversion rates, and assist segregation with AI Vision classification.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsVisionOpen(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <Camera className="w-4 h-4 text-emerald-400" />
            <span>AI Waste Classifier</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Log Waste</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Total Waste Generated</span>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {formatNumber(summary?.totalKg || 0)} <span className="text-sm font-medium text-slate-400">kg</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Campus-wide cumulative weight</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Landfill Diversion Rate</span>
          <div className="text-2xl font-bold text-emerald-600 mt-2">
            {summary?.diversionRatePct || 0}%
          </div>
          <p className="text-xs text-slate-500 mt-1">Recycled & composted percentage</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Organic Waste (Compost)</span>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {formatNumber(summary?.compostKg || 0)} <span className="text-sm font-medium text-slate-400">kg</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Diverted from methane landfilling</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Residual Waste (Landfill)</span>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {formatNumber(summary?.landfillKg || 0)} <span className="text-sm font-medium text-slate-400">kg</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Unsegregated destination</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stream Breakdown Donut */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Waste Categories</h2>
            <p className="text-xs text-slate-500 mt-0.5">Distribution across segregated streams</p>
          </div>

          <div className="h-56 w-full my-auto flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categories}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {categories.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", border: "none", borderRadius: "0.75rem", color: "#fff", fontSize: "12px" }}
                  formatter={(val: any) => [`${formatNumber(Number(val))} kg`, "Waste"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] pt-3 border-t border-slate-100">
            {categories.slice(0, 6).map((c: any, idx: number) => (
              <div key={c.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                <span className="text-slate-600 truncate">{c.name}:</span>
                <span className="font-semibold text-slate-900 ml-auto">{formatNumber(c.value)} kg</span>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Generation Timeline */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Daily Generation & Diversion Trend</h2>
              <p className="text-xs text-slate-500">Total daily waste vs recycled material (kg)</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 font-medium text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span> Total
              </span>
              <span className="flex items-center gap-1 font-medium text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Diverted
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.timeSeries || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} minTickGap={30} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", border: "none", borderRadius: "0.75rem", color: "#fff", fontSize: "12px" }}
                  formatter={(val: any) => [`${formatNumber(Number(val))} kg`, ""]}
                />
                <Bar dataKey="totalKg" name="Total Waste" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="recycledKg" name="Diverted Waste" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <h2 className="text-sm font-bold text-slate-900 mb-3">Waste Log Entries</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-y border-slate-100">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Building</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Quantity (kg)</th>
                <th className="py-2.5 px-3">Disposal Method</th>
                <th className="py-2.5 px-3">Recyclable</th>
                <th className="py-2.5 px-3">Data Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.slice(0, 15).map((r: any) => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 font-mono text-slate-600">
                    {new Date(r.recordedAt).toISOString().split("T")[0]}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{r.building?.name}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-800">{r.wasteCategory}</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-600">{formatNumber(r.quantityKg, 1)} kg</td>
                  <td className="py-2.5 px-3 text-slate-600">{r.disposalMethod}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        r.recyclable ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {r.recyclable ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">{r.dataSource === "DEMO_SIMULATION" ? "Simulated Demo" : r.dataSource}</td>
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
                <Recycle className="w-5 h-5 text-emerald-600" />
                Log Waste Information
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
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
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  {buildingsList.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Waste Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => {
                    const cat = e.target.value;
                    setFormCategory(cat);
                    if (cat === "ORGANIC") setFormDisposal("COMPOSTING");
                    else if (["PAPER", "PLASTIC", "GLASS", "METAL"].includes(cat)) {
                      setFormDisposal("RECYCLING");
                      setFormRecyclable(true);
                    } else {
                      setFormDisposal("LANDFILL");
                      setFormRecyclable(false);
                    }
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  <option value="ORGANIC">Organic / Food Scraps</option>
                  <option value="PAPER">Paper & Cardboard</option>
                  <option value="PLASTIC">Plastic Containers & Packaging</option>
                  <option value="GLASS">Glass Bottles & Vials</option>
                  <option value="METAL">Metal Cans & Scrap</option>
                  <option value="E_WASTE">Electronic / E-Waste</option>
                  <option value="RESIDUAL">Residual / General Waste</option>
                  <option value="OTHER">Other Specialized Waste</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Quantity (Kilograms)</label>
                <input
                  type="number"
                  step="any"
                  value={formQuantity}
                  onChange={(e) => setFormQuantity(e.target.value)}
                  placeholder="e.g. 45.5"
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Disposal Method</label>
                <select
                  value={formDisposal}
                  onChange={(e) => setFormDisposal(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  <option value="RECYCLING">Recycling Facility</option>
                  <option value="COMPOSTING">On-site / Municipal Composting</option>
                  <option value="LANDFILL">Municipal Landfill</option>
                  <option value="INCINERATION">Waste-to-Energy Incineration</option>
                  <option value="SPECIAL_PROCESSING">Hazardous / Special Processing</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Contamination notes, bin location..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
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
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold disabled:opacity-50"
                >
                  {formSubmitting ? "Saving..." : "Save Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Vision Classifier Modal */}
      {isVisionOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Camera className="w-5 h-5 text-emerald-600" />
                AI Waste Image Classifier
              </h2>
              <button onClick={() => setIsVisionOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 mb-4 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Important Notice:</strong> AI vision predictions are advisory suggestions. Personnel must visually verify before confirming classification.
              </span>
            </div>

            {/* Upload Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              {imagePreview ? (
                <div className="flex flex-col items-center">
                  <img src={imagePreview} alt="Waste Upload" className="max-h-48 rounded-xl object-contain shadow-sm mb-3" />
                  <span className="text-xs font-semibold text-emerald-600">Click to change image</span>
                </div>
              ) : (
                <div className="flex flex-col items-center py-4">
                  <Upload className="w-8 h-8 text-slate-400 mb-2" />
                  <p className="text-xs font-semibold text-slate-700">Click to upload photo of waste item</p>
                  <p className="text-[11px] text-slate-400 mt-1">PNG, JPG, WebP up to 10MB</p>
                </div>
              )}
            </div>

            {imagePreview && !visionResult && (
              <button
                onClick={runVisionClassifier}
                disabled={visionLoading}
                className="w-full mt-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                {visionLoading ? (
                  "Analyzing with Gemini Vision..."
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Run AI Classification</span>
                  </>
                )}
              </button>
            )}

            {/* Classification Result Display */}
            {visionResult && (
              <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-600">Suggested Category:</span>
                  <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded uppercase">
                    {visionResult.suggestedCategory}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-600">Confidence:</span>
                  <span className="font-mono text-slate-900">{visionResult.confidencePct}%</span>
                </div>
                <p className="text-slate-600 text-[11px] italic pt-1 border-t border-slate-200">
                  {visionResult.notes}
                </p>

                <div className="pt-3 flex gap-2">
                  <button
                    onClick={() => {
                      setImagePreview(null);
                      setVisionResult(null);
                    }}
                    className="flex-1 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                  >
                    Discard
                  </button>
                  <button
                    onClick={applyVisionClassification}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold"
                  >
                    Confirm & Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
