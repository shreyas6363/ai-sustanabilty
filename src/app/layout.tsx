import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EcoPulse AI – Smart Sustainability Intelligence Platform",
  description:
    "AI-powered resource optimization and sustainability analytics platform for water, energy, waste, and carbon management.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-slate-50 text-slate-900 antialiased selection:bg-emerald-100 selection:text-emerald-900">
        {children}
      </body>
    </html>
  );
}
