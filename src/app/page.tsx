"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import CartDrawer, { CartItem } from "@/components/CartDrawer";
import PaymentModal, { OrderDetails } from "@/components/PaymentModal";
import NotificationBell, { OrderMessageItem } from "@/components/NotificationBell";
import EphemeralMessageModal from "@/components/EphemeralMessageModal";
import { Product } from "@/lib/schema";
import { Sparkles, Shield, Zap, RefreshCw } from "lucide-react";

export default function StorefrontPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeOrder, setActiveOrder] = useState<OrderDetails | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Ephemeral Message Modal State
  const [selectedMessage, setSelectedMessage] = useState<OrderMessageItem | null>(null);
  const [activeClientToken, setActiveClientToken] = useState<string | null>(null);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);

  // Load cart from localStorage
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("mmo_cart");
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
    } catch {
      // ignore
    }
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("mmo_cart", JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart]);

  // Fetch product catalog
  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/products");
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleAddToCart = (product: Product, quantity: number) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity,
          imageUrl: product.imageUrl || undefined,
        },
      ];
    });
    setIsCartOpen(true);
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveItem = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart,
          paymentMethod: "momo",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Order creation failed");

      const createdOrder = data.order as OrderDetails;
      setActiveOrder(createdOrder);
      setIsCartOpen(false);
      setIsPaymentModalOpen(true);

      // Save order metadata in user's localStorage
      const userOrders = JSON.parse(localStorage.getItem("mmo_customer_orders") || "[]");
      userOrders.push({
        id: createdOrder.id,
        publicMemo: createdOrder.publicMemo,
        clientToken: createdOrder.clientToken,
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem("mmo_customer_orders", JSON.stringify(userOrders));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Checkout error");
    }
  };

  const handlePaymentDone = async (orderId: string) => {
    const res = await fetch(`/api/orders/${orderId}/pay`, {
      method: "POST",
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Payment confirmation update failed");
    }
    // Clear the cart on confirmed payment dispatch
    setCart([]);
  };

  const handleOpenMessageModal = (msg: OrderMessageItem, token: string) => {
    setSelectedMessage(msg);
    setActiveClientToken(token);
    setIsMessageModalOpen(true);
  };

  const handleDismissMessage = async (messageId: string, clientToken: string) => {
    await fetch("/api/orders/acknowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId, clientToken }),
    });

    setIsMessageModalOpen(false);
    setSelectedMessage(null);
    setActiveClientToken(null);
  };

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Navbar with Notification Bell */}
      <Navbar
        cartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        notificationBell={
          <NotificationBell
            onOpenModal={handleOpenMessageModal}
            onNewMessageReceived={(msg) => {
              const storedOrders = JSON.parse(localStorage.getItem("mmo_customer_orders") || "[]");
              const match = storedOrders.find((o: { id: string }) => o.id === msg.orderId);
              if (match) {
                handleOpenMessageModal(msg, match.clientToken);
              }
            }}
          />
        }
      />

      {/* Hero Banner */}
      <section className="relative overflow-hidden border-b border-slate-800/80 bg-gradient-to-b from-slate-900/80 to-slate-950 py-12 px-4 sm:px-8">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Fast Automated Bot Bridge</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Premium Digital Goods & Game Items
          </h1>

          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
            Select items, pay via MoMo or Binance QR with your Order ID memo, and receive your credentials directly in your browser.
          </p>

          {/* Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 max-w-2xl mx-auto text-left">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Instant Cart</h4>
                <p className="text-[11px] text-slate-400">Zero account required</p>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-pink-600/20 text-pink-400 flex items-center justify-center shrink-0">
                <RefreshCw className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">MoMo & Binance</h4>
                <p className="text-[11px] text-slate-400">1-click copy & QR pay</p>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Telegram Alert</h4>
                <p className="text-[11px] text-slate-400">Live admin response</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Products Grid Section */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">Available Catalog</h2>
            <p className="text-xs text-slate-400 mt-0.5">Pick item quantity and add to cart</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400">
            {products.length} Products
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 bg-slate-900/50 border border-slate-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/30 border border-slate-800/80 rounded-3xl p-8">
            <p className="text-sm font-semibold text-slate-400">No products available at the moment</p>
            <p className="text-xs text-slate-500 mt-1">Please check back soon or visit the admin portal to add products.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        )}
      </main>

      {/* Cart Slide-over Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onCheckout={handleCheckout}
      />

      {/* Payment & QR Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        order={activeOrder}
        onPaymentDone={handlePaymentDone}
      />

      {/* Ephemeral Message Delivery Modal */}
      <EphemeralMessageModal
        isOpen={isMessageModalOpen}
        message={selectedMessage}
        clientToken={activeClientToken}
        onDismiss={handleDismissMessage}
      />
    </div>
  );
}

