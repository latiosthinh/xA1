"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";

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
  onNewMessageReceived?: (message: OrderMessageItem) => void;
}

export default function NotificationBell({
  onOpenModal,
  onNewMessageReceived,
}: NotificationBellProps) {
  const [messages, setMessages] = useState<OrderMessageItem[]>([]);
  const [hasUnread, setHasUnread] = useState(false);

  const pollOrders = async () => {
    try {
      const storedOrdersRaw = localStorage.getItem("mmo_customer_orders");
      const storedOrders = storedOrdersRaw ? JSON.parse(storedOrdersRaw) : [];
      const acknowledgedIds = JSON.parse(localStorage.getItem("mmo_acknowledged_msg_ids") || "[]");

      const res = await fetch("/api/orders/poll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orders: Array.isArray(storedOrders)
            ? storedOrders.map((o: { id: string; clientToken: string }) => ({
                id: o.id,
                clientToken: o.clientToken,
              }))
            : [],
          acknowledgedIds,
        }),
      });

      if (!res.ok) return;

      const data = await res.json();
      const newMsgs: OrderMessageItem[] = data.messages || [];

      if (newMsgs.length > 0) {
        setMessages(newMsgs);
        setHasUnread(true);

        const latest = newMsgs[0];
        if (onNewMessageReceived) {
          onNewMessageReceived(latest);
        }
      } else {
        setMessages([]);
        setHasUnread(false);
      }
    } catch {
      // Polling network error ignore
    }
  };

  useEffect(() => {
    // Initial check
    pollOrders();

    // Short poll interval every 4 seconds
    const interval = setInterval(pollOrders, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleClick = () => {
    if (messages.length > 0) {
      const storedOrders = JSON.parse(localStorage.getItem("mmo_customer_orders") || "[]");
      const latest = messages[0];
      const match = latest.orderId
        ? storedOrders.find((o: { id: string }) => o.id === latest.orderId)
        : null;

      onOpenModal(latest, match ? match.clientToken : null);
    } else {
      alert("No new messages from admin.");
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`relative p-2 border-2 transition active:translate-y-0.5 flex items-center justify-center shadow-pixel-sm ${
        hasUnread
          ? "bg-amber-500/20 border-amber-400 text-amber-300 animate-pulse"
          : "bg-[#1a1e36] border-slate-600 text-slate-400 hover:text-white"
      }`}
      title={hasUnread ? "You have a message from admin!" : "Notifications"}
    >
      <Bell className={`w-4 h-4 ${hasUnread ? "animate-bounce text-amber-400" : ""}`} />
      {hasUnread && (
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 border border-black" />
      )}
    </button>
  );
}

