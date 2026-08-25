"use client";

import { useState } from "react";
import { Plus, Minus, ShoppingCart, Image as ImageIcon } from "lucide-react";
import { Product } from "@/lib/schema";

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, quantity: number) => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const [quantity, setQuantity] = useState(1);

  const increment = () => setQuantity((q) => q + 1);
  const decrement = () => setQuantity((q) => (q > 1 ? q - 1 : 1));

  const handleAdd = () => {
    onAddToCart(product, quantity);
    setQuantity(1);
  };

  return (
    <div className="bg-slate-900 border border-slate-800/90 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-slate-700 transition group shadow-md hover:shadow-xl hover:shadow-indigo-500/5">
      {/* Product Image & Badge */}
      <div className="h-44 bg-slate-950 relative overflow-hidden flex items-center justify-center border-b border-slate-800/80">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-600">
            <ImageIcon className="w-8 h-8 mb-1" />
            <span className="text-[10px]">Digital Item</span>
          </div>
        )}
        <div className="absolute top-3 right-3 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-emerald-400 font-extrabold px-2.5 py-1 rounded-lg text-sm shadow">
          ${product.price.toFixed(2)}
        </div>
      </div>

      {/* Product Details */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-base text-white tracking-tight leading-snug">{product.name}</h3>
          <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
            {product.description || "Instant automatic delivery item."}
          </p>
        </div>

        {/* Quantity & Add to Cart */}
        <div className="mt-5 pt-4 border-t border-slate-800/70 flex items-center justify-between gap-3">
          <div className="flex items-center border border-slate-800 bg-slate-950 rounded-xl p-0.5">
            <button
              onClick={decrement}
              className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition active:scale-95"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="w-8 text-center text-xs font-bold text-slate-200">{quantity}</span>
            <button
              onClick={increment}
              className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition active:scale-95"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          <button
            onClick={handleAdd}
            className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2 px-3 rounded-xl shadow-md shadow-indigo-600/20 active:scale-[0.98] transition"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Add to Cart</span>
          </button>
        </div>
      </div>
    </div>
  );
}
