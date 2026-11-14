"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bell,
  Building,
  Calendar,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { SessionUser } from "@/types";

interface HeaderProps {
  user?: SessionUser | null;
  unreadAlertsCount?: number;
}

export function Header({ unreadAlertsCount = 2 }: HeaderProps) {
  const [aiStatus, setAiStatus] = useState<string>("Checking AI Engine...");
  const [isGeminiLive, setIsGeminiLive] = useState<boolean>(false);

  useEffect(() => {
    fetch("/api/ai/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.mode === "GEMINI_LIVE") {
          setAiStatus("Gemini Generative AI");
          setIsGeminiLive(true);
        } else {
          setAiStatus("Rule-Based Fallback Mode");
          setIsGeminiLive(false);
        }
      })
      .catch(() => {
        setAiStatus("Rule-Based Fallback Mode");
        setIsGeminiLive(false);
      });
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Organization Scope */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
          <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            <Building className="w-4 h-4" />
          </div>
          <span>Green Valley Educational Campus</span>
        </div>

        <div className="h-4 w-[1px] bg-slate-200 hidden sm:block"></div>

        <div className="items-center gap-1.5 text-xs text-slate-500 hidden sm:flex">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>Active Window: Past 90 Days</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Transparent AI Status Pill */}
        <div
          title={
            isGeminiLive
              ? "Google Gemini Live AI engine active"
              : "Rule-Based Deterministic Fallback active (Configure GEMINI_API_KEY in .env for live LLM)"
          }
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
        >
          <Sparkles
            className={`w-3.5 h-3.5 ${
              isGeminiLive ? "text-emerald-500 animate-pulse" : "text-amber-500"
            }`}
          />
          <span className="hidden md:inline text-[11px] text-slate-500">AI Engine:</span>
          <span className="font-semibold text-[11px] text-slate-800">{aiStatus}</span>
        </div>

        {/* Alerts Center Bell */}
        <Link
          href="/alerts"
          className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          title="Alert Center"
        >
          <Bell className="w-4 h-4" />
          {unreadAlertsCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadAlertsCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
