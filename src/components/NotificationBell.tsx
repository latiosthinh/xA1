"use client";

import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
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
  onNewMessageReceived?: (message: OrderMessageItem) => void;
}

export default function NotificationBell({
  onOpenModal,
  onNewMessageReceived,
}: NotificationBellProps) {
  const [messages, setMessages] = useState<OrderMessageItem[]>([]);
  const [hasUnread, setHasUnread] = useState(false);
  const promptedMsgIdsRef = useRef<Set<string>>(new Set());

  const customerOrders = useStore((s) => s.customerOrders);
  const acknowledgedMsgIds = useStore((s) => s.acknowledgedMsgIds);

  const pollOrders = async () => {
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

      if (newMsgs.length > 0) {
        setMessages(newMsgs);
        setHasUnread(true);

        const latest = newMsgs[0];
        // Only auto popup ONCE per message ID unless clicked manually
        if (!promptedMsgIdsRef.current.has(latest.id)) {
          promptedMsgIdsRef.current.add(latest.id);
          if (onNewMessageReceived) {
            onNewMessageReceived(latest);
          }
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
    pollOrders();
    const interval = setInterval(pollOrders, 4000);
    return () => clearInterval(interval);
  }, [customerOrders, acknowledgedMsgIds]);

  const handleClick = () => {
    if (messages.length > 0) {
      const latest = messages[0];
      const match = latest.orderId
        ? customerOrders.find((o) => o.id === latest.orderId)
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



