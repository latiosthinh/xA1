"use client";

import { useState, useRef, useEffect } from "react";
import { 
  ReceiptText, 
  X, 
  Bell, 
  CheckCircle2, 
  ExternalLink, 
  Clock, 
  ShieldAlert,
  Send,
  Sparkles
} from "lucide-react";
import { useStore, StoredCustomerOrder } from "@/lib/store";
import { formatDualPrice } from "@/lib/currency";
import { OrderDetails } from "./PaymentModal";

interface FloatingOrderManagerProps {
  onReopenPayment: (order: OrderDetails) => void;
}

export default function FloatingOrderManager({ onReopenPayment }: FloatingOrderManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [noticingOrderId, setNoticingOrderId] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<{ id: string; text: string } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const customerOrders = useStore((s) => s.customerOrders);
  const updateOrderLastNoticed = useStore((s) => s.updateOrderLastNoticed);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  if (!customerOrders || customerOrders.length === 0) {
    return null;
  }

  // Reverse list to show newest orders first
  const sortedOrders = [...customerOrders].reverse();

  const handleNoticeAdmin = async (order: StoredCustomerOrder, e: React.MouseEvent) => {
    e.stopPropagation();
    const lastNoticedAt = order.lastNoticedAt || 0;
    const now = Date.now();
    const TEN_MINUTES_MS = 10 * 60 * 1000;

    if (now - lastNoticedAt < TEN_MINUTES_MS) {
      const minutesLeft = Math.ceil((TEN_MINUTES_MS - (now - lastNoticedAt)) / (60 * 1000));
      alert(`Please wait ${minutesLeft} more minute(s) before alerting admin again.`);
      return;
    }

    setNoticingOrderId(order.id);
    setNoticeMessage(null);

    try {
      const res = await fetch("/api/orders/notice-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          clientToken: order.clientToken,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to alert admin");

      updateOrderLastNoticed(order.id, Date.now());
      setNoticeMessage({ id: order.id, text: "Admin alerted on Telegram!" });
      setTimeout(() => setNoticeMessage(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to dispatch alert");
    } finally {
      setNoticingOrderId(null);
    }
  };

  const handleOpenPayment = (order: StoredCustomerOrder) => {
    const formattedOrder: OrderDetails = {
      id: order.id,
      publicMemo: order.publicMemo,
      clientToken: order.clientToken,
      totalAmount: order.totalAmount || 0,
      paymentMethod: order.paymentMethod || "momo",
      items: order.items || [],
      status: order.status || "PENDING",
    };
    onReopenPayment(formattedOrder);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="fixed bottom-5 right-5 z-40">
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3.5 py-2.5 bg-[#121524] border-2 border-emerald-500/80 hover:border-emerald-400 text-emerald-400 font-pixel text-[10px] shadow-pixel-lg hover:bg-[#1a1e36] active:translate-y-0.5 transition"
        title="View your pending orders"
      >
        <ReceiptText className="w-4 h-4 text-emerald-400" />
        <span className="font-bold">MY ORDERS ({customerOrders.length})</span>
      </button>

      {/* Floating Popup List */}
      {isOpen && (
        <div className="absolute bottom-12 right-0 w-80 sm:w-96 bg-[#121524] border-2 border-slate-700 shadow-2xl p-4 shadow-pixel-lg animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between pb-3 mb-3 border-b-2 border-slate-700">
            <div className="flex items-center gap-2">
              <ReceiptText className="w-4 h-4 text-emerald-400" />
              <h3 className="font-pixel text-xs text-white">ACTIVE ORDERS</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-white transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
            Click any order to view payment guide or alert admin via the bell button.
          </p>

          {/* Orders list */}
          <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1">
            {sortedOrders.map((ord) => {
              const lastNoticedAt = ord.lastNoticedAt || 0;
              const canNotice = Date.now() - lastNoticedAt >= 10 * 60 * 1000;

              return (
                <div
                  key={ord.id}
                  onClick={() => handleOpenPayment(ord)}
                  className="bg-[#161a2e] border-2 border-slate-700 hover:border-emerald-400/80 p-3 cursor-pointer transition flex flex-col gap-2 shadow-pixel-sm group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-pixel text-[10px] text-emerald-400 font-bold block">
                        {ord.publicMemo}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(ord.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {ord.totalAmount ? (
                      <span className="font-pixel text-[10px] text-white">
                        {formatDualPrice(ord.totalAmount)}
                      </span>
                    ) : null}
                  </div>

                  {ord.items && ord.items.length > 0 && (
                    <div className="text-[10px] text-slate-300 truncate">
                      {ord.items.map((i) => `${i.name} x${i.quantity}`).join(", ")}
                    </div>
                  )}

                  {noticeMessage?.id === ord.id && (
                    <div className="text-[10px] text-emerald-400 font-pixel">
                      ✓ {noticeMessage.text}
                    </div>
                  )}

                  {/* Actions inside order item */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenPayment(ord);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 font-pixel text-[9px] bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-1.5 px-2 border border-emerald-300 shadow-pixel-sm active:translate-y-0.5 transition"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>PAYMENT GUIDE</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleNoticeAdmin(ord, e)}
                      disabled={noticingOrderId === ord.id || !canNotice}
                      className="flex items-center justify-center gap-1 font-pixel text-[9px] bg-[#1a1e36] hover:bg-[#252b4d] text-amber-300 border border-amber-500/50 hover:border-amber-400 py-1.5 px-2.5 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-pixel-sm"
                      title={canNotice ? "Alert admin on Telegram" : "Rate limit 10 minutes"}
                    >
                      <Bell className="w-3 h-3 text-amber-400" />
                      <span>{noticingOrderId === ord.id ? "ALERTING..." : "NOTICE"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
