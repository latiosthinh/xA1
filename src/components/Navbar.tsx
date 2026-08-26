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
    <header className="sticky top-0 z-40 bg-[#1c1914] border-b-2 border-[#3d3326] px-4 sm:px-8 py-3 flex items-center justify-between shadow-pixel">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2.5 group">
          {/* Claude Terracotta Pixel Logo */}
          <div className="w-9 h-9 bg-[#d97706] border-2 border-[#f59e0b] flex items-center justify-center text-[#14120e] shadow-pixel-sm group-hover:bg-[#b45309] transition">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div>
            <span className="font-pixel text-sm sm:text-base tracking-wider text-[#fbbf24] group-hover:text-[#fde68a] drop-shadow-[2px_2px_0px_rgba(0,0,0,0.8)]">
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
          className="relative flex items-center gap-2 px-3 py-2 bg-[#262018] border-2 border-[#4a3d2e] hover:border-[#d97706] text-[#f4eee0] transition active:translate-y-0.5 shadow-pixel-sm font-pixel text-[11px]"
        >
          <ShoppingBag className="w-3.5 h-3.5 text-[#fbbf24]" />
          <span>CART</span>
          {cartCount > 0 && (
            <span className="inline-flex items-center justify-center px-1.5 py-0.2 text-[9px] font-bold text-[#14120e] bg-[#fbbf24] border border-[#fef3c7] min-w-[16px]">
              {cartCount}
            </span>
          )}
        </button>

        {/* Admin Link */}
        <Link
          href="/admin"
          className="p-2 bg-[#262018] border-2 border-[#4a3d2e] hover:border-[#d97706] text-[#d4c5b3] hover:text-white transition shadow-pixel-sm"
          title="Admin Panel"
        >
          <Shield className="w-4 h-4" />
        </Link>
      </div>
    </header>
  );
}
