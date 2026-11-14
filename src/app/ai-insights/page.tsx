"use client";

import { useEffect, useState, useRef } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  Sparkles,
  Send,
  Bot,
  User,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Zap,
  Droplets,
  Recycle,
  Globe2,
} from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "advisor";
  text: string;
  mode?: "GEMINI_LIVE" | "RULE_BASED_FALLBACK";
  timestamp: string;
}

const SUGGESTED_QUERIES = [
  "Which building consumes the most electricity?",
  "Which building has the highest water consumption?",
  "Why did water usage spike recently?",
  "What are our main waste management bottlenecks?",
  "How is our Sustainability Score calculated?",
  "What actions can reduce our carbon footprint by 15%?",
];

export default function AIInsightsPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "intro",
      sender: "advisor",
      text: "Hello! I am **EcoPulse AI Advisor**, your conversational sustainability intelligence assistant. I analyze verified environmental records across Green Valley Educational Campus to explain resource patterns, identify anomalies, and recommend actionable conservation measures.\n\nHow can I assist your sustainability initiatives today?",
      mode: "RULE_BASED_FALLBACK",
      timestamp: "Just now",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [engineStatus, setEngineStatus] = useState<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/ai/status")
      .then((res) => res.json())
      .then((data) => setEngineStatus(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (questionText?: string) => {
    const q = questionText || input;
    if (!q.trim() || loading) return;

    const userMsg: Message = {
      id: `usr_${Date.now()}`,
      sender: "user",
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!questionText) setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Advisor error");

      const botMsg: Message = {
        id: `bot_${Date.now()}`,
        sender: "advisor",
        text: data.answer,
        mode: data.mode,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: "advisor",
          text: "I encountered an error querying the database. Please try again or rephrase your question.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      {/* Top Title & Engine Status */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-md shadow-emerald-950/20">
              <Sparkles className="w-5 h-5" />
            </div>
            EcoPulse AI Advisor
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Context-aware conversational intelligence grounded strictly in verified campus telemetry.
          </p>
        </div>

        {/* Transparent Active Mode Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs text-xs">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              engineStatus?.mode === "GEMINI_LIVE" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
            }`}
          ></span>
          <span className="font-semibold text-slate-800">
            {engineStatus?.mode === "GEMINI_LIVE"
              ? "Live Gemini Generative AI"
              : "Rule-Based Deterministic Fallback"}
          </span>
          <span className="text-[10px] text-slate-400">
            {engineStatus?.mode === "GEMINI_LIVE" ? "(Cloud LLM Active)" : "(Offline Safe Mode)"}
          </span>
        </div>
      </div>

      {/* Suggested Query Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs font-semibold text-slate-400 shrink-0">Quick Queries:</span>
        {SUGGESTED_QUERIES.map((sq, i) => (
          <button
            key={i}
            onClick={() => handleSend(sq)}
            className="text-xs font-medium px-3 py-1.5 bg-white hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 rounded-full text-slate-700 whitespace-nowrap transition-colors shadow-2xs cursor-pointer"
          >
            {sq}
          </button>
        ))}
      </div>

      {/* Main Chat Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col h-[600px] overflow-hidden">
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {messages.map((m) => {
            const isUser = m.sender === "user";
            return (
              <div
                key={m.id}
                className={`flex items-start gap-3.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isUser
                      ? "bg-slate-900 text-white"
                      : "bg-emerald-100 text-emerald-800 border border-emerald-300/60"
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div
                  className={`max-w-2xl rounded-2xl px-5 py-3.5 text-xs leading-relaxed ${
                    isUser
                      ? "bg-slate-900 text-white rounded-tr-none shadow-sm"
                      : "bg-slate-50 text-slate-800 rounded-tl-none border border-slate-200 shadow-2xs"
                  }`}
                >
                  <div className="whitespace-pre-wrap space-y-1.5 prose prose-xs max-w-none">
                    {m.text}
                  </div>

                  <div
                    className={`mt-2 flex items-center justify-between text-[10px] ${
                      isUser ? "text-slate-400" : "text-slate-400 border-t border-slate-200/60 pt-1.5"
                    }`}
                  >
                    {!isUser && m.mode && (
                      <span className="font-semibold text-emerald-700">
                        {m.mode === "GEMINI_LIVE" ? "• Verified via Gemini AI" : "• Verified via Database Logic"}
                      </span>
                    )}
                    <span>{m.timestamp}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
              <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <span className="flex items-center gap-1.5">
                Analyzing database telemetry and calculating insights...
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]"></span>
              </span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2.5"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about campus water, electricity, waste, or carbon footprint..."
              className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-2xs"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-40 cursor-pointer"
            >
              <span>Ask Advisor</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
          <p className="text-[10px] text-slate-400 mt-2 text-center">
            EcoPulse AI Advisor strictly references actual recorded database values. Does not fabricate numbers.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
