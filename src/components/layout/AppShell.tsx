"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { SessionUser } from "@/types";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) throw new Error("Unauthenticated");
        return res.json();
      })
      .then((data) => {
        if (data.authenticated) setUser(data.user);
      })
      .catch(() => {
        // Fallback default demo user if local browsing without login
        setUser({
          id: "demo-user-1",
          name: "Dr. Elena Vance (Campus Admin)",
          email: "admin@ecopulse.ai",
          role: "ADMIN",
          organizationId: "demo-org-greenvalley",
          organizationName: "Green Valley Educational Campus",
        });
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header user={user} />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
