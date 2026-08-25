"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, AlertTriangle, ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-[#0d0f18] selection:bg-emerald-500 selection:text-black">
      <div className="w-full max-w-md bg-[#121524] border-2 border-slate-700 p-6 sm:p-8 shadow-pixel-lg relative">
        {/* Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-12 h-12 bg-emerald-500 border-2 border-emerald-300 flex items-center justify-center text-slate-950 mb-3 shadow-pixel-sm">
            <Lock className="w-6 h-6" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#1a1e36] border border-emerald-500/40 text-emerald-400 font-pixel text-[9px] mb-2">
            <ShieldCheck className="w-3 h-3" />
            <span>OPERATOR ACCESS</span>
          </div>
          <h1 className="font-pixel text-base sm:text-lg text-white tracking-wider drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">
            ADMIN TERMINAL
          </h1>
          <p className="text-xs text-slate-400 mt-1">Sign in to control inventory & orders</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-rose-950/60 border-2 border-rose-600 flex items-center gap-2.5 text-rose-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block font-pixel text-[9px] uppercase tracking-wider text-slate-400 mb-1.5">
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full bg-[#0d0f18] border-2 border-slate-700 pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-400 transition"
              />
            </div>
          </div>

          <div>
            <label className="block font-pixel text-[9px] uppercase tracking-wider text-slate-400 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0d0f18] border-2 border-slate-700 pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-400 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-pixel text-xs py-3 px-4 border-2 border-emerald-300 shadow-pixel-sm active:translate-y-0.5 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{loading ? "AUTHENTICATING..." : "SIGN IN"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t-2 border-slate-800 text-center">
          <Link
            href="/"
            className="font-pixel text-[9px] text-slate-400 hover:text-emerald-400 transition"
          >
            ← BACK TO STOREFRONT
          </Link>
        </div>
      </div>
    </main>
  );
}

