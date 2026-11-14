"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Leaf, Lock, Mail, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed. Please verify credentials.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950 shadow-xl shadow-emerald-950/60 mb-3">
            <Leaf className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            EcoPulse <span className="text-emerald-400 font-extrabold text-xs px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800">AI</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1 font-medium">
            AI-Powered Sustainability Intelligence Platform
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white">Sign in to your organization</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Access real-time resource optimization, forecasts, and AI insights.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-950/50 border border-rose-800/60 flex items-start gap-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@organization.edu"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-950/50 disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Authenticating..." : "Sign In to Platform"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Logins Section */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <p className="text-[11px] font-semibold text-slate-400 mb-2.5 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Demo Accounts (One-Click Fill):
            </p>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => fillDemo("admin@ecopulse.ai", "Admin@EcoPulse2025")}
                className="text-left px-3 py-2 rounded-lg bg-slate-950 hover:bg-slate-800/80 border border-slate-800 transition-colors text-xs flex items-center justify-between group"
              >
                <div>
                  <span className="font-semibold text-white group-hover:text-emerald-300">
                    Administrator
                  </span>
                  <p className="text-[11px] text-slate-400">admin@ecopulse.ai</p>
                </div>
                <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/40">
                  Full Access
                </span>
              </button>

              <button
                type="button"
                onClick={() => fillDemo("manager@ecopulse.ai", "Manager@EcoPulse2025")}
                className="text-left px-3 py-2 rounded-lg bg-slate-950 hover:bg-slate-800/80 border border-slate-800 transition-colors text-xs flex items-center justify-between group"
              >
                <div>
                  <span className="font-semibold text-white group-hover:text-emerald-300">
                    Sustainability Manager
                  </span>
                  <p className="text-[11px] text-slate-400">manager@ecopulse.ai</p>
                </div>
                <span className="text-[10px] uppercase font-bold text-teal-400 bg-teal-950/80 px-1.5 py-0.5 rounded border border-teal-800/40">
                  Manager
                </span>
              </button>

              <button
                type="button"
                onClick={() => fillDemo("viewer@ecopulse.ai", "Viewer@EcoPulse2025")}
                className="text-left px-3 py-2 rounded-lg bg-slate-950 hover:bg-slate-800/80 border border-slate-800 transition-colors text-xs flex items-center justify-between group"
              >
                <div>
                  <span className="font-semibold text-white group-hover:text-emerald-300">
                    Faculty / Student Viewer
                  </span>
                  <p className="text-[11px] text-slate-400">viewer@ecopulse.ai</p>
                </div>
                <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/40">
                  Read Only
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Demo Footer */}
        <p className="text-center text-[11px] text-slate-500 mt-4">
          Demo data is simulated for academic & evaluation purposes.
        </p>
      </div>
    </div>
  );
}
