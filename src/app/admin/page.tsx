"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Package, 
  Plus, 
  Trash2, 
  Edit3, 
  LogOut, 
  ExternalLink, 
  Search, 
  DollarSign,
  X,
  Check,
  Gamepad2,
  Sparkles,
  Upload,
  Image as ImageIcon
} from "lucide-react";
import Link from "next/link";
import { formatDualPrice } from "@/lib/currency";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  createdAt: string;
}

export default function AdminDashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("10");
  const [imageUrl, setImageUrl] = useState("");
  const [imageTab, setImageTab] = useState<"file" | "url">("file");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Image size must be under 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(reader.result as string);
      setError("");
    };
    reader.onerror = () => {
      setError("Failed to read image file");
    };
    reader.readAsDataURL(file);
  };

  const router = useRouter();

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/products");
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      const data = await res.json();
      setProducts(data.products || []);
    } catch {
      setError("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setName("");
    setDescription("");
    setPrice("");
    setStock("10");
    setImageUrl("");
    setError("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setDescription(p.description || "");
    setPrice(String(p.price));
    setStock(String(p.stock ?? 0));
    setImageUrl(p.imageUrl || "");
    setError("");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price || isNaN(Number(price))) {
      setError("Please provide a valid product name and numeric price");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        price: Number(price),
        stock: isNaN(Number(stock)) ? 0 : Number(stock),
        imageUrl: imageUrl.trim(),
      };

      let res: Response;
      if (editingProduct) {
        res = await fetch(`/api/admin/products/${editingProduct.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Action failed");
      }

      setIsModalOpen(false);
      fetchProducts();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setProducts(products.filter((p) => p.id !== id));
      }
    } catch {
      alert("Failed to delete product");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0d0f18] text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-black">
      {/* Retro Pixel Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#121524] border-b-2 border-slate-700/80 px-4 sm:px-8 py-3 flex items-center justify-between shadow-pixel">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-500 border-2 border-emerald-300 flex items-center justify-center text-slate-950 shadow-pixel-sm">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-pixel text-xs sm:text-sm tracking-wider text-emerald-400 drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">
              ADMIN CONTROL PANEL
            </h1>
            <p className="font-pixel text-[8px] text-slate-400 mt-0.5">CATALOG & INVENTORY</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1e36] border-2 border-slate-600 hover:border-emerald-400 text-slate-200 text-[10px] font-pixel transition active:translate-y-0.5 shadow-pixel-sm"
          >
            <span>STOREFRONT</span>
            <ExternalLink className="w-3 h-3 text-emerald-400" />
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/40 border-2 border-rose-600 hover:bg-rose-900/60 text-rose-300 text-[10px] font-pixel transition active:translate-y-0.5 shadow-pixel-sm"
          >
            <LogOut className="w-3 h-3" />
            <span>LOGOUT</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6 pb-4 border-b-2 border-slate-800">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Filter items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#121524] border-2 border-slate-700 pl-9 pr-4 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-400 transition"
            />
          </div>

          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-pixel text-xs py-2.5 px-4 border-2 border-emerald-300 shadow-pixel-sm active:translate-y-0.5 transition font-bold"
          >
            <Plus className="w-4 h-4" />
            <span>ADD NEW PRODUCT</span>
          </button>
        </div>

        {/* Product Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-56 bg-[#161a2e] border-2 border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-[#161a2e] border-2 border-slate-800 p-8 shadow-pixel">
            <Package className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="font-pixel text-xs text-slate-300">NO PRODUCTS FOUND</h3>
            <p className="text-xs text-slate-500 mt-2">
              Add your first inventory item to appear on the storefront catalog.
            </p>
            <button
              onClick={handleOpenAdd}
              className="mt-4 inline-flex items-center gap-2 font-pixel text-[10px] bg-emerald-500 text-slate-950 px-3.5 py-2 border-2 border-emerald-300 shadow-pixel-sm font-bold active:translate-y-0.5 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ADD PRODUCT</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-[#161a2e] border-2 border-slate-700 hover:border-emerald-400 transition flex flex-col justify-between shadow-pixel group"
              >
                {/* Image area */}
                <div className="h-40 bg-[#0d0f18] relative flex items-center justify-center overflow-hidden border-b-2 border-slate-800 p-2">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-contain pixelated group-hover:scale-105 transition duration-300"
                      style={{ imageRendering: "pixelated" }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-emerald-400">
                      <Sparkles className="w-8 h-8 mb-1 opacity-60" />
                      <span className="font-pixel text-[8px] text-slate-500">NO IMAGE</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-[#0e111f] border-2 border-slate-700 text-emerald-400 font-pixel text-[9px] px-2 py-0.5 shadow-pixel-sm">
                    {formatDualPrice(product.price)}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-pixel text-xs text-white tracking-wide truncate">
                        {product.name}
                      </h3>
                      <span
                        className={`font-pixel text-[8px] px-1.5 py-0.5 border shrink-0 ${
                          (product.stock ?? 0) > 0
                            ? "bg-emerald-950/80 border-emerald-600 text-emerald-300"
                            : "bg-rose-950/80 border-rose-600 text-rose-300"
                        }`}
                      >
                        STOCK: {product.stock ?? 0}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed bg-[#0e111f] p-2 border border-slate-800">
                      {product.description || "No description provided."}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t-2 border-slate-800 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleOpenEdit(product)}
                      className="p-1.5 bg-[#1a1e36] border-2 border-slate-600 text-slate-300 hover:text-emerald-400 hover:border-emerald-400 transition shadow-pixel-sm"
                      title="Edit Product"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="p-1.5 bg-rose-950/40 border-2 border-rose-600 text-rose-400 hover:bg-rose-900/60 transition shadow-pixel-sm"
                      title="Delete Product"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#121524] border-2 border-slate-700 p-6 shadow-pixel-lg relative">
            <div className="flex items-center justify-between pb-4 border-b-2 border-slate-700 bg-[#0e111f] -mx-6 -mt-6 p-4 mb-5">
              <h2 className="font-pixel text-xs text-white tracking-wider">
                {editingProduct ? "EDIT INVENTORY ITEM" : "ADD NEW ITEM"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-2.5 bg-rose-950/60 border-2 border-rose-600 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block font-pixel text-[9px] uppercase text-slate-400 mb-1.5">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. VIP Game Pass / Account 100K"
                  className="w-full bg-[#0d0f18] border-2 border-slate-700 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-400 placeholder:text-slate-600 transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-pixel text-[9px] uppercase text-slate-400 mb-1.5">
                    Price (VND) *
                  </label>
                  <div className="relative">
                    <DollarSign className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="number"
                      step="1000"
                      min="0"
                      required
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="70000"
                      className="w-full bg-[#0d0f18] border-2 border-slate-700 pl-8 pr-2.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-400 placeholder:text-slate-600 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-pixel text-[9px] uppercase text-slate-400 mb-1.5">
                    Stock Quantity *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="10"
                    className="w-full bg-[#0d0f18] border-2 border-slate-700 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-400 placeholder:text-slate-600 transition"
                  />
                </div>
              </div>

              {/* Product Image Selection: File Upload or Direct URL */}
              <div className="border-2 border-slate-700/80 bg-[#0d0f18] p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-pixel text-[9px] uppercase text-slate-400">
                    Product Image
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setImageTab("file")}
                      className={`font-pixel text-[8px] px-2 py-0.5 border ${
                        imageTab === "file"
                          ? "bg-emerald-500 text-slate-950 border-emerald-300 font-bold"
                          : "bg-[#161a2e] text-slate-400 border-slate-700 hover:text-white"
                      }`}
                    >
                      UPLOAD FILE
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageTab("url")}
                      className={`font-pixel text-[8px] px-2 py-0.5 border ${
                        imageTab === "url"
                          ? "bg-emerald-500 text-slate-950 border-emerald-300 font-bold"
                          : "bg-[#161a2e] text-slate-400 border-slate-700 hover:text-white"
                      }`}
                    >
                      IMAGE URL
                    </button>
                  </div>
                </div>

                {imageTab === "file" ? (
                  <div>
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 hover:border-emerald-400/70 bg-[#121524] p-3 cursor-pointer transition text-center">
                      <Upload className="w-5 h-5 text-emerald-400 mb-1" />
                      <span className="font-pixel text-[9px] text-slate-300">CHOOSE IMAGE FILE</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">PNG, JPG, GIF, WebP (max 2MB)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://example.com/image.png or data:image/..."
                      className="w-full bg-[#121524] border-2 border-slate-700 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-400 placeholder:text-slate-600 transition"
                    />
                  </div>
                )}

                {/* Preview Thumbnail */}
                {imageUrl && (
                  <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 bg-[#121524] border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                        <img
                          src={imageUrl}
                          alt="Preview"
                          className="w-full h-full object-contain pixelated"
                          style={{ imageRendering: "pixelated" }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                        Image attached
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setImageUrl("")}
                      className="font-pixel text-[8px] text-rose-400 hover:text-rose-300 border border-rose-600/60 bg-rose-950/40 px-2 py-1"
                    >
                      REMOVE
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-pixel text-[9px] uppercase text-slate-400 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Package details, server, delivery format..."
                  className="w-full bg-[#0d0f18] border-2 border-slate-700 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-400 placeholder:text-slate-600 resize-none transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t-2 border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 border-2 border-slate-700 bg-[#0d0f18] text-slate-400 hover:text-white font-pixel text-[10px] transition"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-pixel text-[10px] px-4 py-2 border-2 border-emerald-300 shadow-pixel-sm active:translate-y-0.5 transition font-bold disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{saving ? "SAVING..." : editingProduct ? "UPDATE ITEM" : "CREATE ITEM"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

