"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Droplets,
  Zap,
  Recycle,
  Globe2,
  Sparkles,
  Lightbulb,
  SlidersHorizontal,
  FileBarChart2,
  Building2,
  Database,
  Bell,
  Settings,
  LogOut,
  Leaf,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { SessionUser } from "@/types";

interface SidebarProps {
  user?: SessionUser | null;
}

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/water", label: "Water Intelligence", icon: Droplets },
  { href: "/energy", label: "Energy Intelligence", icon: Zap },
  { href: "/waste", label: "Waste Management", icon: Recycle },
  { href: "/carbon", label: "Carbon Footprint", icon: Globe2 },
  { href: "/ai-insights", label: "AI Advisor", icon: Sparkles, badge: "AI" },
  { href: "/recommendations", label: "Recommendations", icon: Lightbulb },
  { href: "/simulator", label: "What-If Simulator", icon: SlidersHorizontal },
  { href: "/reports", label: "Reports & Exports", icon: FileBarChart2 },
  { href: "/buildings", label: "Buildings & Sites", icon: Building2 },
  { href: "/data-management", label: "Data Management", icon: Database },
  { href: "/alerts", label: "Alert Center", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      window.location.href = "/login";
    }
  };

  return (
    <aside className="w-64 bg-slate-950 text-slate-200 border-r border-emerald-950/40 flex flex-col h-screen sticky top-0 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-900 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-950/50">
            <Leaf className="w-5 h-5 text-emerald-100" />
          </div>
          <div>
            <div className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
              EcoPulse <span className="text-emerald-400 font-extrabold text-xs px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800">AI</span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Sustainability Intelligence</p>
          </div>
        </Link>
      </div>

      {/* Simulated Demo Notice Badge */}
      <div className="mx-4 mt-3 px-2.5 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-[11px] text-emerald-300 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span className="font-semibold uppercase tracking-wider text-[10px]">Demo Campus</span>
        <span className="text-slate-400 text-[10px] ml-auto">Simulated</span>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5 scrollbar-thin scrollbar-thumb-slate-800">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all group",
                isActive
                  ? "bg-emerald-600 text-white shadow-sm font-semibold shadow-emerald-900/30"
                  : "text-slate-300 hover:text-white hover:bg-slate-900/80"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 transition-colors",
                  isActive ? "text-white" : "text-emerald-400/80 group-hover:text-emerald-300"
                )}
              />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span
                  className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Session Footer */}
      <div className="p-3 border-t border-slate-900 bg-slate-950/70">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-slate-900/60 border border-slate-800/70">
          <div className="w-8 h-8 rounded-full bg-emerald-900/70 border border-emerald-700/50 flex items-center justify-center text-emerald-200">
            <UserIcon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">
              {user?.name || "Demo User"}
            </p>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-400">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                {user?.role || "ADMIN"}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-md transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
