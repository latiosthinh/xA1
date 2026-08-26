"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import CartDrawer from "@/components/CartDrawer";
import PaymentModal, { OrderDetails } from "@/components/PaymentModal";
import NotificationBell, { OrderMessageItem } from "@/components/NotificationBell";
import EphemeralMessageModal from "@/components/EphemeralMessageModal";
import { Product } from "@/lib/schema";
import { Sparkles, Shield, Zap, RefreshCw } from "lucide-react";
import { useStore } from "@/lib/store";

interface StorefrontClientProps {
  initialProducts: Product[];
}

export default function StorefrontClient({ initialProducts }: StorefrontClientProps) {
  // Hydration helper for persisted Zustand store in Next.js
  const [hasHydrated, setHasHydrated] = useState(false);

  const cart = useStore((s) => s.cart);
  const isCartOpen = useStore((s) => s.isCartOpen);
  const addToCart = useStore((s) => s.addToCart);
  const updateQuantity = useStore((s) => s.updateQuantity);
  const removeFromCart = useStore((s) => s.removeFromCart);
  const openCart = useStore((s) => s.openCart);
  const closeCart = useStore((s) => s.closeCart);
  const clearCart = useStore((s) => s.clearCart);

  const activeOrder = useStore((s) => s.activeOrder);
  const isPaymentModalOpen = useStore((s) => s.isPaymentModalOpen);
  const openPaymentModal = useStore((s) => s.openPaymentModal);
  const closePaymentModal = useStore((s) => s.closePaymentModal);

  const selectedMessage = useStore((s) => s.selectedMessage);
  const activeClientToken = useStore((s) => s.activeClientToken);
  const isMessageModalOpen = useStore((s) => s.isMessageModalOpen);
  const openMessageModal = useStore((s) => s.openMessageModal);
  const closeMessageModal = useStore((s) => s.closeMessageModal);

  const customerOrders = useStore((s) => s.customerOrders);
  const addCustomerOrder = useStore((s) => s.addCustomerOrder);
  const acknowledgeMessageId = useStore((s) => s.acknowledgeMessageId);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

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
      openPaymentModal(createdOrder);

      // Save order metadata in Zustand persist
      addCustomerOrder({
        id: createdOrder.id,
        publicMemo: createdOrder.publicMemo,
        clientToken: createdOrder.clientToken,
        createdAt: new Date().toISOString(),
      });
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
    clearCart();
  };

  const handleDismissMessage = async (messageId: string, clientToken: string | null) => {
    acknowledgeMessageId(messageId);

    await fetch("/api/orders/acknowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId, clientToken }),
    });

    closeMessageModal();
  };

  const totalCartCount = hasHydrated ? cart.reduce((sum, item) => sum + item.quantity, 0) : 0;

  const inStockProducts = initialProducts.filter((p) => (p.stock ?? 0) > 0);
  const outOfStockProducts = initialProducts.filter((p) => (p.stock ?? 0) <= 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Navbar with Notification Bell */}
      <Navbar
        cartCount={totalCartCount}
        onOpenCart={openCart}
        notificationBell={
          <NotificationBell
            onOpenModal={openMessageModal}
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

          <div className="inline-block max-w-xl mx-auto p-3 bg-amber-950/40 border-2 border-amber-500/60 text-amber-200 text-xs sm:text-sm leading-relaxed shadow-pixel-sm">
            <span className="font-pixel text-[10px] sm:text-xs text-amber-400 block mb-1">MAINTENANCE NOTICE</span>
            store.xa1.space temporary under maintenance, some products might be unavailable currently, we&apos;ll get back as soon as possible
          </div>

          <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
            Select game items, pay via MoMo or Binance with your Order Memo, and collect your delivery directly in your browser.
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
                <h4 className="font-pixel text-[9px] text-white">MOMO / BINANCE</h4>
                <p className="text-[11px] text-slate-400">Direct transfer memo</p>
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

      {/* Products Grid Section - Server Pre-Rendered */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 space-y-10">
        {/* In-Stock Section */}
        <div>
          <div className="flex items-center justify-between mb-6 pb-3 border-b-2 border-slate-800">
            <div>
              <h2 className="font-pixel text-sm sm:text-base text-emerald-400 tracking-wider">
                AVAILABLE INVENTORY
              </h2>
              <p className="text-xs text-slate-400 mt-1">Pick quantities and add to your bag</p>
            </div>
            <span className="font-pixel text-[10px] px-2.5 py-1 bg-[#1a1e36] border border-emerald-500/30 text-emerald-400">
              IN STOCK: {inStockProducts.length}
            </span>
          </div>

          {inStockProducts.length === 0 ? (
            <div className="text-center py-12 bg-[#161a2e] border-2 border-slate-800 p-6">
              <p className="font-pixel text-xs text-slate-400">NO ITEMS CURRENTLY IN STOCK</p>
              <p className="text-xs text-slate-500 mt-2">Check back soon or see below for incoming catalog items.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {inStockProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={addToCart}
                />
              ))}
            </div>
          )}
        </div>

        {/* Out-Of-Stock / Not-Available Section */}
        {outOfStockProducts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6 pb-3 border-b-2 border-slate-800">
              <div>
                <h2 className="font-pixel text-sm sm:text-base text-rose-400 tracking-wider">
                  NOT AVAILABLE (OUT OF STOCK)
                </h2>
                <p className="text-xs text-slate-400 mt-1">These items are temporarily out of stock</p>
              </div>
              <span className="font-pixel text-[10px] px-2.5 py-1 bg-[#1a1e36] border border-rose-500/30 text-rose-400">
                OUT OF STOCK: {outOfStockProducts.length}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {outOfStockProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={addToCart}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Cart Slide-over Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={closeCart}
        items={cart}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeFromCart}
        onCheckout={handleCheckout}
      />

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={closePaymentModal}
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
