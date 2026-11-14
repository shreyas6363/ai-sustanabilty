import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const isConfigured = Boolean(apiKey && apiKey.length > 5);

  return NextResponse.json({
    mode: isConfigured ? "GEMINI_LIVE" : "RULE_BASED_FALLBACK",
    hasApiKey: isConfigured,
    model: isConfigured ? "gemini-1.5-flash" : "Deterministic Rule-Based Intelligence Engine",
    description: isConfigured
      ? "Google Gemini AI model connected and reasoning over database metrics."
      : "Operating in transparent Rule-Based Fallback mode (deterministic SQL queries without external AI credentials).",
  });
}
