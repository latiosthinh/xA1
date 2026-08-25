"use client";

import { ShoppingBag, Shield, Gamepad2 } from "lucide-react";
import Link from "next/link";

interface NavbarProps {
  cartCount: number;
  onOpenCart: () => void;
  notificationBell?: React.ReactNode;
}

export default function Navbar({ cartCount, onOpenCart, notificationBell }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 bg-[#121524] border-b-2 border-slate-700/80 px-4 sm:px-8 py-3 flex items-center justify-between shadow-pixel">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2.5 group">
          {/* Retro Pixel Logo */}
          <div className="w-9 h-9 bg-emerald-500 border-2 border-emerald-300 flex items-center justify-center text-slate-950 shadow-pixel-sm group-hover:bg-emerald-400 transition">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div>
            <span className="font-pixel text-sm sm:text-base tracking-wider text-emerald-400 group-hover:text-emerald-300 drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">
              xA1store
            </span>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Notification Bell */}
        {notificationBell}

        {/* Cart Button */}
        <button
          onClick={onOpenCart}
          className="relative flex items-center gap-2 px-3 py-2 bg-[#1a1e36] border-2 border-slate-600 hover:border-emerald-400 text-slate-100 transition active:translate-y-0.5 shadow-pixel-sm font-pixel text-[11px]"
        >
          <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
          <span>CART</span>
          {cartCount > 0 && (
            <span className="inline-flex items-center justify-center px-1.5 py-0.2 text-[9px] font-bold text-slate-950 bg-emerald-400 border border-emerald-200 min-w-[16px]">
              {cartCount}
            </span>
          )}
        </button>

        {/* Admin Link */}
        <Link
          href="/admin"
          className="p-2 bg-[#1a1e36] border-2 border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white transition shadow-pixel-sm"
          title="Admin Panel"
        >
          <Shield className="w-4 h-4" />
        </Link>
      </div>
    </header>
  );
}
