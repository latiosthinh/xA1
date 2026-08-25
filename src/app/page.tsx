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

  const handleOpenMessageModal = (msg: OrderMessageItem, token: string | null) => {
    setSelectedMessage(msg);
    setActiveClientToken(token);
    setIsMessageModalOpen(true);
  };

  const handleDismissMessage = async (messageId: string, clientToken: string | null) => {
    // Record acknowledged message in local storage so client doesn't see global notice again
    const localAck = JSON.parse(localStorage.getItem("mmo_acknowledged_msg_ids") || "[]");
    if (!localAck.includes(messageId)) {
      localAck.push(messageId);
      localStorage.setItem("mmo_acknowledged_msg_ids", JSON.stringify(localAck));
    }

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
              if (!msg.orderId || msg.publicMemo === "GLOBAL") {
                handleOpenMessageModal(msg, null);
              } else {
                const storedOrders = JSON.parse(localStorage.getItem("mmo_customer_orders") || "[]");
                const match = storedOrders.find((o: { id: string }) => o.id === msg.orderId);
                if (match) {
                  handleOpenMessageModal(msg, match.clientToken);
                }
              }
            }}
          />
        }
      />

      {/* Hero Banner with Pixel Aesthetic */}
      <section className="relative overflow-hidden border-b-2 border-slate-800 bg-[#121524] py-10 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#1a1e36] border border-emerald-500/40 text-emerald-400 font-pixel text-[10px]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>8-BIT DIGITAL OUTPOST</span>
          </div>

          <h1 className="font-pixel text-xl sm:text-3xl text-white tracking-wider leading-relaxed drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">
            xA1store Pixel Catalog
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
            Select game items, pay via MoMo or Binance QR with your Order Memo, and collect your delivery directly in your browser.
          </p>

          {/* Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 max-w-2xl mx-auto text-left">
            <div className="bg-[#161a2e] border-2 border-slate-700 p-3 flex items-center gap-3 shadow-pixel-sm">
              <div className="w-8 h-8 bg-emerald-500/20 text-emerald-400 border border-emerald-400 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-pixel text-[9px] text-white">INSTANT CART</h4>
                <p className="text-[11px] text-slate-400">Zero signup needed</p>
              </div>
            </div>

            <div className="bg-[#161a2e] border-2 border-slate-700 p-3 flex items-center gap-3 shadow-pixel-sm">
              <div className="w-8 h-8 bg-pink-500/20 text-pink-400 border border-pink-400 flex items-center justify-center shrink-0">
                <RefreshCw className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-pixel text-[9px] text-white">QR / PAY ID</h4>
                <p className="text-[11px] text-slate-400">MoMo & Binance</p>
              </div>
            </div>

            <div className="bg-[#161a2e] border-2 border-slate-700 p-3 flex items-center gap-3 shadow-pixel-sm">
              <div className="w-8 h-8 bg-amber-500/20 text-amber-400 border border-amber-400 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-pixel text-[9px] text-white">BOT DELIVERY</h4>
                <p className="text-[11px] text-slate-400">Live admin alert</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Products Grid Section */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-8">
        <div className="flex items-center justify-between mb-6 pb-3 border-b-2 border-slate-800">
          <div>
            <h2 className="font-pixel text-sm sm:text-base text-emerald-400 tracking-wider">
              AVAILABLE INVENTORY
            </h2>
            <p className="text-xs text-slate-400 mt-1">Pick quantities and add to your bag</p>
          </div>
          <span className="font-pixel text-[10px] px-2.5 py-1 bg-[#1a1e36] border border-slate-700 text-slate-300">
            ITEMS: {products.length}
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-44 bg-[#161a2e] border-2 border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 bg-[#161a2e] border-2 border-slate-800 p-6">
            <p className="font-pixel text-xs text-slate-400">NO ITEMS IN STOCK</p>
            <p className="text-xs text-slate-500 mt-2">Visit admin panel to add inventory.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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

