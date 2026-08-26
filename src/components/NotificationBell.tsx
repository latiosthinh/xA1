"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Check, Radio, ShieldCheck, XCircle, HelpCircle, MessageSquare } from "lucide-react";
import { useStore } from "@/lib/store";

export interface OrderMessageItem {
  id: string;
  orderId?: string | null;
  publicMemo: string;
  sender: string;
  content: string;
  status: string;
  createdAt: string;
}

interface NotificationBellProps {
  onOpenModal: (message: OrderMessageItem, clientToken: string | null) => void;
}

export default function NotificationBell({
  onOpenModal,
}: NotificationBellProps) {
  const [messages, setMessages] = useState<OrderMessageItem[]>([]);
  const [isOpenDropdown, setIsOpenDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const customerOrders = useStore((s) => s.customerOrders);
  const acknowledgedMsgIds = useStore((s) => s.acknowledgedMsgIds);
  const acknowledgeMessageId = useStore((s) => s.acknowledgeMessageId);

  const pollOrders = async () => {
    if (typeof document !== "undefined" && document.hidden) return;

    try {
      const res = await fetch("/api/orders/poll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orders: Array.isArray(customerOrders)
            ? customerOrders.map((o) => ({
                id: o.id,
                clientToken: o.clientToken,
              }))
            : [],
          acknowledgedIds: acknowledgedMsgIds,
        }),
      });

      if (!res.ok) return;

      const data = await res.json();
      const newMsgs: OrderMessageItem[] = data.messages || [];

      // Filter out messages that user has already acknowledged
      const unreadList = newMsgs.filter((m) => !acknowledgedMsgIds.includes(m.id));
      setMessages(unreadList);
    } catch {
      // Polling network error ignore
    }
  };

  useEffect(() => {
    pollOrders();
    const interval = setInterval(pollOrders, 10000);
    return () => clearInterval(interval);
  }, [customerOrders.length, acknowledgedMsgIds.length]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpenDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (e: React.MouseEvent, msg: OrderMessageItem) => {
    e.stopPropagation();
    acknowledgeMessageId(msg.id);
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));

    const match = msg.orderId
      ? customerOrders.find((o) => o.id === msg.orderId)
      : null;

    await fetch("/api/orders/acknowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId: msg.id, clientToken: match ? match.clientToken : null }),
    });
  };

  const handleItemClick = (msg: OrderMessageItem) => {
    const match = msg.orderId
      ? customerOrders.find((o) => o.id === msg.orderId)
      : null;

    setIsOpenDropdown(false);
    onOpenModal(msg, match ? match.clientToken : null);
  };

  const hasUnread = messages.length > 0;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpenDropdown(!isOpenDropdown)}
        className={`relative p-2 border-2 transition active:translate-y-0.5 flex items-center justify-center shadow-pixel-sm ${
          hasUnread
            ? "bg-amber-500/20 border-amber-400 text-amber-300 animate-pulse"
            : "bg-[#1a1e36] border-slate-600 text-slate-400 hover:text-white"
        }`}
        title="Notifications"
      >
        <Bell className={`w-4 h-4 ${hasUnread ? "text-amber-400" : ""}`} />
        {hasUnread && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 border border-black" />
        )}
      </button>

      {/* Retro Pixel Message Dropdown Menu */}
      {isOpenDropdown && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#121524] border-2 border-slate-700 shadow-pixel-lg z-50 p-3">
          <div className="flex items-center justify-between pb-2 mb-2 border-b-2 border-slate-700">
            <h4 className="font-pixel text-[10px] text-white flex items-center gap-1.5">
              <span>MESSAGES</span>
              <span className="text-emerald-400">({messages.length})</span>
            </h4>
            <span className="font-pixel text-[8px] text-slate-500">CLICK ITEM TO VIEW</span>
          </div>

          <div className="max-h-72 overflow-y-auto space-y-2">
            {messages.length === 0 ? (
              <div className="py-6 text-center text-slate-500 font-pixel text-[9px]">
                NO NEW MESSAGES
              </div>
            ) : (
              messages.map((msg) => {
                const isGlobal = !msg.orderId || msg.publicMemo === "GLOBAL";
                const isSuccess = msg.content.startsWith("CODE:1");
                const isFailed = msg.content.startsWith("CODE:0");
                const isVerify = msg.content.startsWith("CODE:2");

                return (
                  <div
                    key={msg.id}
                    onClick={() => handleItemClick(msg)}
                    className="p-2.5 bg-[#161a2e] hover:bg-[#1f243f] border-2 border-slate-700 hover:border-emerald-400 transition cursor-pointer flex items-start justify-between gap-2 shadow-pixel-sm"
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <div className="mt-0.5 shrink-0">
                        {isGlobal ? (
                          <Radio className="w-3.5 h-3.5 text-amber-400" />
                        ) : isSuccess ? (
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        ) : isFailed ? (
                          <XCircle className="w-3.5 h-3.5 text-rose-400" />
                        ) : isVerify ? (
                          <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-pixel text-[9px] text-white truncate">
                          {isGlobal ? "STORE ANNOUNCEMENT" : `ORDER: ${msg.publicMemo}`}
                        </p>
                        <p className="text-xs text-slate-300 line-clamp-1 mt-0.5">
                          {isSuccess
                            ? "Payment confirmed (Success)"
                            : isFailed
                            ? "Payment rejected"
                            : isVerify
                            ? "Payment under review"
                            : msg.content}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleMarkAsRead(e, msg)}
                      className="px-1.5 py-1 bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-400 border border-slate-600 hover:border-emerald-300 font-pixel text-[8px] shrink-0 transition"
                      title="Mark as read (never notify again)"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}





