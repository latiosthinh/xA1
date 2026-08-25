"use client";

import { X, Trash2, Plus, Minus, ArrowRight, ShoppingBag } from "lucide-react";
import { formatDualPrice } from "@/lib/currency";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onCheckout: () => void;
}

export default function CartDrawer({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
}: CartDrawerProps) {
  if (!isOpen) return null;

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
      />

      {/* Drawer */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#121524] border-l-2 border-slate-700 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 border-b-2 border-slate-700 flex items-center justify-between bg-[#0e111f]">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
              <h2 className="font-pixel text-xs text-white tracking-wider">YOUR CART</h2>
              <span className="font-pixel text-[10px] text-slate-400">({items.length})</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 border-2 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {items.length === 0 ? (
              <div className="text-center py-16">
                <ShoppingBag className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                <p className="font-pixel text-xs text-slate-400">CART IS EMPTY</p>
                <p className="text-xs text-slate-500 mt-2">Pick an item from the catalog</p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#161a2e] border-2 border-slate-700 p-3 flex items-center gap-3 shadow-pixel-sm"
                >
                  <div className="w-12 h-12 bg-[#0d0f18] border-2 border-slate-700 shrink-0 p-1 flex items-center justify-center">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-contain pixelated"
                        style={{ imageRendering: "pixelated" }}
                      />
                    ) : (
                      <ShoppingBag className="w-5 h-5 text-emerald-500" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-pixel text-[10px] text-white truncate">{item.name}</h4>
                    <p className="font-pixel text-[10px] text-emerald-400 mt-1">
                      {formatDualPrice(item.price * item.quantity)}
                    </p>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-slate-600 bg-[#0d0f18]">
                        <button
                          onClick={() => onUpdateQuantity(item.id, -1)}
                          className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="w-6 text-center font-pixel text-[9px] text-slate-200">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, 1)}
                          className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 transition"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer & Checkout */}
          {items.length > 0 && (
            <div className="p-4 border-t-2 border-slate-700 bg-[#0e111f] space-y-3">
              <div className="flex items-center justify-between text-sm flex-wrap gap-2">
                <span className="font-pixel text-[11px] text-slate-400">TOTAL:</span>
                <span className="font-pixel text-xs text-emerald-400">{formatDualPrice(subtotal)}</span>
              </div>

              <button
                onClick={onCheckout}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-pixel text-xs py-3 px-4 border-2 border-emerald-300 shadow-pixel-sm active:translate-y-0.5 transition"
              >
                <span>CHECKOUT NOW</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
