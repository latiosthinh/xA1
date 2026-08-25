"use client";

import { useState } from "react";
import { Plus, Minus, ShoppingCart, Sparkles, Ban } from "lucide-react";
import { Product } from "@/lib/schema";

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, quantity: number) => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const [quantity, setQuantity] = useState(1);
  const stock = product.stock ?? 0;
  const isOutOfStock = stock <= 0;

  const increment = () => {
    if (quantity < stock) {
      setQuantity((q) => q + 1);
    }
  };
  const decrement = () => setQuantity((q) => (q > 1 ? q - 1 : 1));

  const handleAdd = () => {
    if (isOutOfStock) return;
    onAddToCart(product, quantity);
    setQuantity(1);
  };

  return (
    <div
      className={`bg-[#161a2e] border-2 ${
        isOutOfStock
          ? "border-slate-800 opacity-60 grayscale-[0.6]"
          : "border-slate-700 hover:border-emerald-400"
      } p-4 flex flex-col justify-between transition shadow-pixel relative group`}
    >
      {/* Top Bar: Icon + Title + Price */}
      <div>
        <div className="flex items-start gap-3.5">
          {/* Pixelated Image-Icon */}
          <div className="w-14 h-14 bg-[#0d0f18] border-2 border-slate-700 p-1.5 shrink-0 flex items-center justify-center shadow-pixel-sm relative">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-contain pixelated"
                style={{ imageRendering: "pixelated" }}
              />
            ) : (
              <div className="w-full h-full bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Sparkles className="w-6 h-6" />
              </div>
            )}

            {isOutOfStock && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <Ban className="w-6 h-6 text-rose-500" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <h3 className="font-pixel text-xs text-white tracking-wide truncate leading-relaxed">
                {product.name}
              </h3>
            </div>

            <div className="flex items-center gap-2 mt-1.5">
              <span className="font-pixel text-xs text-emerald-400">
                ${product.price.toFixed(2)}
              </span>

              <span
                className={`font-pixel text-[9px] px-1.5 py-0.5 border ${
                  isOutOfStock
                    ? "bg-rose-950/80 border-rose-600 text-rose-400"
                    : "bg-emerald-950/80 border-emerald-600 text-emerald-300"
                }`}
              >
                {isOutOfStock ? "SOLD OUT" : `STOCK: ${stock}`}
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-400 mt-3 line-clamp-2 leading-relaxed bg-[#0e111f] p-2 border border-slate-800">
          {product.description || "Digital Game Item - Instant delivery to browser."}
        </p>
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-3 border-t-2 border-slate-800 flex items-center justify-between gap-2.5">
        {/* Quantity control */}
        <div className="flex items-center border-2 border-slate-700 bg-[#0d0f18]">
          <button
            onClick={decrement}
            disabled={isOutOfStock}
            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="w-7 text-center font-pixel text-[10px] text-slate-200">
            {isOutOfStock ? 0 : quantity}
          </span>
          <button
            onClick={increment}
            disabled={isOutOfStock || quantity >= stock}
            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Add button */}
        <button
          onClick={handleAdd}
          disabled={isOutOfStock}
          className={`flex-1 flex items-center justify-center gap-1.5 font-pixel text-[10px] py-2 px-3 border-2 transition shadow-pixel-sm active:translate-y-0.5 ${
            isOutOfStock
              ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed"
              : "bg-emerald-500 hover:bg-emerald-400 border-emerald-300 text-slate-950 font-bold"
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>{isOutOfStock ? "NO STOCK" : "ADD"}</span>
        </button>
      </div>
    </div>
  );
}
