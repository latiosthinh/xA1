"use client";

import { useState } from "react";
import { Plus, Minus, ShoppingCart, Sparkles, Ban } from "lucide-react";
import { Product } from "@/lib/schema";
import { formatDualPrice } from "@/lib/currency";
import { getProductIconUrl } from "@/lib/product-icons";

import { getEffectiveProductAttributes } from "@/lib/description";

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

  const displayImage = getProductIconUrl(product.name, product.imageUrl);

  return (
    <div
      className={`bg-[#1c1914] border-2 ${
        isOutOfStock
          ? "border-[#332b20] opacity-60 grayscale-[0.6]"
          : "border-[#443a2f] hover:border-[#d97706]"
      } p-4 flex flex-col justify-between transition shadow-pixel relative group`}
    >
      {/* Top Bar: Icon + Title + Price */}
      <div>
        <div className="flex items-start gap-3.5">
          {/* Pixelated Image-Icon */}
          <div className="w-14 h-14 bg-[#14120e] border-2 border-[#443a2f] p-1.5 shrink-0 flex items-center justify-center shadow-pixel-sm relative">
            {displayImage ? (
              <img
                src={displayImage}
                alt={product.name}
                className="w-full h-full object-contain pixelated"
                style={{ imageRendering: "pixelated" }}
              />
            ) : (
              <div className="w-full h-full bg-[#2a1c0d] border border-[#d97706]/30 flex items-center justify-center text-[#fbbf24]">
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
              <h3 className="font-pixel text-xs text-[#f4eee0] tracking-wide truncate leading-relaxed">
                {product.name}
              </h3>
            </div>

            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="font-pixel text-[11px] text-[#fbbf24]">
                {formatDualPrice(product.price)}
              </span>

              <span
                className={`font-pixel text-[9px] px-1.5 py-0.5 border ${
                  isOutOfStock
                    ? "bg-rose-950/80 border-rose-600 text-rose-300"
                    : "bg-[#2a1c0d] border-[#d97706]/60 text-[#fbbf24]"
                }`}
              >
                {isOutOfStock ? "SOLD OUT" : `STOCK: ${stock}`}
              </span>
            </div>
          </div>
        </div>

        {/* Specs Badge */}
        {(() => {
          const specs = getEffectiveProductAttributes(product);
          const hasSpecs = Boolean(specs.duration || specs.type || specs.warranty);

          if (hasSpecs) {
            return (
              <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-pixel">
                {specs.duration && (
                  <span className="bg-[#1c140d] border border-[#d97706]/40 text-[#fcd34d] px-1.5 py-0.5 shadow-pixel-sm flex items-center gap-1">
                    <span className="text-[11px] leading-none">⏳</span>
                    <span>{specs.duration}</span>
                  </span>
                )}
                {specs.type && (
                  <span className="bg-[#14181f] border border-[#38bdf8]/40 text-[#7dd3fc] px-1.5 py-0.5 shadow-pixel-sm flex items-center gap-1">
                    <span className="text-[11px] leading-none">📦</span>
                    <span>{specs.type}</span>
                  </span>
                )}
                {specs.warranty && (
                  <span className="bg-[#141f17] border border-[#22c55e]/40 text-[#86efac] px-1.5 py-0.5 shadow-pixel-sm flex items-center gap-1">
                    <span className="text-[11px] leading-none">🛡️</span>
                    <span>{specs.warranty.toLowerCase().startsWith("warranty") ? specs.warranty : `Warranty ${specs.warranty}`}</span>
                  </span>
                )}
              </div>
            );
          }

          return null;
        })()}
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-3 border-t-2 border-[#332b20] flex items-center justify-between gap-2.5">
        {/* Quantity control */}
        <div className="flex items-center border-2 border-[#443a2f] bg-[#14120e]">
          <button
            onClick={decrement}
            disabled={isOutOfStock}
            className="w-7 h-7 flex items-center justify-center text-[#8c7e6e] hover:text-white disabled:opacity-30"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="w-7 text-center font-pixel text-[10px] text-[#f4eee0]">
            {isOutOfStock ? 0 : quantity}
          </span>
          <button
            onClick={increment}
            disabled={isOutOfStock || quantity >= stock}
            className="w-7 h-7 flex items-center justify-center text-[#8c7e6e] hover:text-white disabled:opacity-30"
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
              ? "bg-[#241f18] border-[#332b20] text-[#716556] cursor-not-allowed"
              : "bg-[#d97706] hover:bg-[#b45309] border-[#f59e0b] text-[#14120e] font-bold"
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>{isOutOfStock ? "NO STOCK" : "ADD"}</span>
        </button>
      </div>
    </div>
  );
}
