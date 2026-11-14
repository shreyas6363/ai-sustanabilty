"use client";

import { useState, useRef } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  Database,
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldCheck,
} from "lucide-react";

export default function DataManagementPage() {
  const [recordKind, setRecordKind] = useState<"RESOURCE" | "WASTE">("RESOURCE");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setImporting(true);
    setResult(null);
    setError(null);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("recordKind", recordKind);

    try {
      const res = await fetch("/api/data-management/import", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Import validation failed.");
      }

      setResult(json);
      setSelectedFile(null);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <AppShell>
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-slate-100 text-slate-800 border border-slate-200">
            <Database className="w-5 h-5" />
          </div>
          Data Ingestion & Integrity Management
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          CSV batch import with duplicate validation, cell formula sanitization (CWE-1236 protection), and telemetry provenance auditing.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CSV Import Box */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-600" />
              Batch CSV Import
            </h2>
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={() => setRecordKind("RESOURCE")}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                  recordKind === "RESOURCE"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Water / Energy
              </button>
              <button
                type="button"
                onClick={() => setRecordKind("WASTE")}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                  recordKind === "WASTE"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Waste
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-600 space-y-1 leading-relaxed">
            <p>
              Expected CSV columns for <strong>{recordKind === "RESOURCE" ? "Water / Electricity" : "Waste Streams"}</strong>:
            </p>
            <code className="block p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px] text-slate-800">
              {recordKind === "RESOURCE"
                ? "Date, Building Code, Resource Type (WATER/ELECTRICITY), Quantity, Unit, Category"
                : "Date, Building Code, Waste Category, Quantity (kg), Disposal Method, Recyclable"}
            </code>
          </div>

          {/* Upload Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-800">
              {selectedFile ? selectedFile.name : "Click to select CSV file from your computer"}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Validates duplicates, building codes, and formats</p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{result.message}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-2 border-t border-emerald-200/60">
                <div>Inserted Rows: <strong>{result.insertedCount}</strong></div>
                <div>Duplicates Skipped: <strong>{result.duplicateCount}</strong></div>
              </div>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!selectedFile || importing}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-40 cursor-pointer"
          >
            {importing ? "Validating & Ingesting..." : "Process CSV Batch"}
          </button>
        </div>

        {/* CSV Export & Provenance Box */}
        <div className="space-y-6">
          {/* Export Box */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Download className="w-4 h-4 text-teal-600" />
              Sanitized CSV Data Export
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Export verified database telemetry to safe CSV files. All cell contents are automatically sanitized with leading quote prefixes against spreadsheet formula injection (CWE-1236).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
              <a
                href="/api/data-management/export?type=water"
                download
                className="py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center justify-center gap-2 transition-colors text-center"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Water Records</span>
              </a>

              <a
                href="/api/data-management/export?type=energy"
                download
                className="py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center justify-center gap-2 transition-colors text-center"
              >
                <Download className="w-3.5 h-3.5 text-amber-600" />
                <span>Energy Records</span>
              </a>

              <a
                href="/api/data-management/export?type=waste"
                download
                className="py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center justify-center gap-2 transition-colors text-center"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Waste Records</span>
              </a>
            </div>
          </div>

          {/* Provenance Box */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3 text-xs">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Data Provenance Architecture
            </h2>
            <p className="text-slate-600 leading-relaxed">
              Every resource observation stored in EcoPulse AI is immutably tagged with its acquisition source:
            </p>

            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  DEMO_SIMULATION
                </span>
                <span className="text-slate-600">Simulated campus test fixtures with realistic day-to-day variance.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  MANUAL
                </span>
                <span className="text-slate-600">Logged directly by facility operators via dashboard forms.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                  CSV_IMPORT
                </span>
                <span className="text-slate-600">Bulk utility bills and meter spreadsheets uploaded and parsed.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  IOT_SENSOR
                </span>
                <span className="text-slate-600">Authenticated automated telemetry ingested from sub-meters via API.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
