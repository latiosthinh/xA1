import Link from "next/link";
import { Package, ShieldCheck } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center text-indigo-400 mb-6">
        <Package className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl mb-3">
        MMO Storefront
      </h1>
      <p className="text-slate-400 max-w-md mx-auto mb-8 text-sm">
        Phase 1 initialized. Admin authentication and Turso LibSQL product database ready.
      </p>
      <div className="flex gap-4">
        <Link
          href="/admin"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 px-5 rounded-xl shadow-lg shadow-indigo-600/20 transition"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Admin Portal</span>
        </Link>
      </div>
    </main>
  );
}
