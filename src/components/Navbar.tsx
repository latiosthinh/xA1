"use client";

import { ShoppingBag, Shield } from "lucide-react";
import Link from "next/link";

interface NavbarProps {
  cartCount: number;
  onOpenCart: () => void;
  notificationBell?: React.ReactNode;
}

export default function Navbar({ cartCount, onOpenCart, notificationBell }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-lg border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-white group-hover:text-indigo-400 transition">
              MMO Store
            </span>
            <span className="hidden sm:inline text-[10px] text-slate-500 block -mt-1 font-medium">
              Instant Telegram Delivery
            </span>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Notification Bell (Phase 3 slot) */}
        {notificationBell}

        {/* Cart Button */}
        <button
          onClick={onOpenCart}
          className="relative flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-850 text-slate-200 transition active:scale-95 shadow-sm"
        >
          <ShoppingBag className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold">Cart</span>
          {cartCount > 0 && (
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold text-white bg-indigo-600 rounded-full min-w-[18px]">
              {cartCount}
            </span>
          )}
        </button>

        {/* Admin Link */}
        <Link
          href="/admin"
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition"
          title="Admin Panel"
        >
          <Shield className="w-4 h-4" />
        </Link>
      </div>
    </header>
  );
}
