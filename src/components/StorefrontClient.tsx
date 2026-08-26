"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import CartDrawer from "@/components/CartDrawer";
import PaymentModal, { OrderDetails } from "@/components/PaymentModal";
import NotificationBell, { OrderMessageItem } from "@/components/NotificationBell";
import EphemeralMessageModal from "@/components/EphemeralMessageModal";
import FloatingOrderManager from "@/components/FloatingOrderManager";
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
        totalAmount: createdOrder.totalAmount,
        paymentMethod: createdOrder.paymentMethod,
        items: createdOrder.items,
        status: createdOrder.status || "PENDING",
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
    <div className="min-h-screen bg-[#14120e] text-[#f4eee0] flex flex-col selection:bg-[#d97706] selection:text-white">
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

      {/* Hero Banner with Claude Editorial Vintage Aesthetic */}
      <section className="relative overflow-hidden border-b-2 border-[#3d3326] bg-[#1c1914] py-10 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#262018] border border-[#d97706]/50 text-[#fbbf24] font-pixel text-[10px]">
            <Sparkles className="w-3.5 h-3.5 text-[#fbbf24]" />
            <span>EDITORIAL DIGITAL OUTPOST</span>
          </div>

          <h1 className="font-pixel text-xl sm:text-3xl text-[#f4eee0] tracking-wider leading-relaxed drop-shadow-[2px_2px_0px_rgba(0,0,0,0.8)]">
            xA1store Catalog
          </h1>

          <div className="inline-block max-w-xl mx-auto p-3 bg-[#2a1c0d] border-2 border-[#d97706]/70 text-[#fef3c7] text-xs sm:text-sm leading-relaxed shadow-pixel-sm">
            <span className="font-pixel text-[10px] sm:text-xs text-[#fbbf24] block mb-1">MAINTENANCE NOTICE</span>
            store.xa1.space temporary under maintenance, some products might be unavailable currently, we&apos;ll get back as soon as possible
          </div>

          <p className="text-xs sm:text-sm text-[#d4c5b3] max-w-lg mx-auto leading-relaxed">
            Support online: 18:00 - 24:00 (UTC+7) - email: clementlynch62738993@gmail.com
          </p>

          {/* Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 max-w-2xl mx-auto text-left">
            <div className="bg-[#241f18] border-2 border-[#443a2f] p-3 flex items-center gap-3 shadow-pixel-sm">
              <div className="w-8 h-8 bg-[#d97706]/20 text-[#fbbf24] border border-[#d97706] flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-pixel text-[9px] text-[#f4eee0]">INSTANT CART</h4>
                <p className="text-[11px] text-[#b8a896]">Zero signup needed</p>
              </div>
            </div>

            <div className="bg-[#241f18] border-2 border-[#443a2f] p-3 flex items-center gap-3 shadow-pixel-sm">
              <div className="w-8 h-8 bg-[#c026d3]/20 text-[#f0abfc] border border-[#c026d3] flex items-center justify-center shrink-0">
                <RefreshCw className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-pixel text-[9px] text-[#f4eee0]">MOMO / BINANCE</h4>
                <p className="text-[11px] text-[#b8a896]">Direct transfer memo</p>
              </div>
            </div>

            <div className="bg-[#241f18] border-2 border-[#443a2f] p-3 flex items-center gap-3 shadow-pixel-sm">
              <div className="w-8 h-8 bg-[#ea580c]/20 text-[#fdba74] border border-[#ea580c] flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-pixel text-[9px] text-[#f4eee0]">BOT DELIVERY</h4>
                <p className="text-[11px] text-[#b8a896]">Live admin alert</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Products Grid Section - Server Pre-Rendered */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 space-y-10">
        {/* In-Stock Section */}
        <div>
          <div className="flex items-center justify-between mb-6 pb-3 border-b-2 border-[#3d3326]">
            <div>
              <h2 className="font-pixel text-sm sm:text-base text-[#fbbf24] tracking-wider">
                AVAILABLE INVENTORY
              </h2>
              <p className="text-xs text-[#b8a896] mt-1">Pick quantities and add to your bag</p>
            </div>
            <span className="font-pixel text-[10px] px-2.5 py-1 bg-[#262018] border border-[#d97706]/40 text-[#fbbf24]">
              IN STOCK: {inStockProducts.length}
            </span>
          </div>

          {inStockProducts.length === 0 ? (
            <div className="text-center py-12 bg-[#1c1914] border-2 border-[#3d3326] p-6">
              <p className="font-pixel text-xs text-[#b8a896]">NO ITEMS CURRENTLY IN STOCK</p>
              <p className="text-xs text-[#8c7e6e] mt-2">Check back soon or see below for incoming catalog items.</p>
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
            <div className="flex items-center justify-between mb-6 pb-3 border-b-2 border-[#3d3326]">
              <div>
                <h2 className="font-pixel text-sm sm:text-base text-[#f87171] tracking-wider">
                  NOT AVAILABLE (OUT OF STOCK)
                </h2>
                <p className="text-xs text-[#b8a896] mt-1">These items are temporarily out of stock</p>
              </div>
              <span className="font-pixel text-[10px] px-2.5 py-1 bg-[#262018] border border-rose-500/40 text-[#f87171]">
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

      {/* Bottom-right Floating Order Manager */}
      <FloatingOrderManager onReopenPayment={openPaymentModal} />
    </div>
  );
}
