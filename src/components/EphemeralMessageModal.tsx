"use client";

import { useState } from "react";
import { 
  AlertTriangle, 
  Copy, 
  Check, 
  MessageSquare, 
  ShieldAlert, 
  CheckCircle2,
  XCircle,
  Radio,
  Clock,
  Send,
  HelpCircle
} from "lucide-react";
import { OrderMessageItem } from "./NotificationBell";
import { useStore } from "@/lib/store";

interface EphemeralMessageModalProps {
  isOpen: boolean;
  message: OrderMessageItem | null;
  clientToken: string | null;
  onDismiss: (messageId: string, clientToken: string | null) => Promise<void>;
}

export default function EphemeralMessageModal({
  isOpen,
  message,
  clientToken,
  onDismiss,
}: EphemeralMessageModalProps) {
  const [copied, setCopied] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [isNoticingAdmin, setIsNoticingAdmin] = useState(false);
  const [noticeSuccess, setNoticeSuccess] = useState<string | null>(null);

  const customerOrders = useStore((s) => s.customerOrders);
  const updateOrderLastNoticed = useStore((s) => s.updateOrderLastNoticed);

  if (!isOpen || !message) return null;

  const rawContent = message.content || "";
  const isGlobal = !message.orderId || message.publicMemo === "GLOBAL";

  // Parse Status Codes from Telegram message: CODE:1, CODE:0, CODE:2
  const isCode1Success = rawContent.startsWith("CODE:1");
  const isCode0Failed = rawContent.startsWith("CODE:0");
  const isCode2Verify = rawContent.startsWith("CODE:2");

  const displayBody = (isCode1Success || isCode0Failed || isCode2Verify)
    ? rawContent.split("|").slice(1).join("|").trim()
    : rawContent;

  const currentOrder = message.orderId
    ? customerOrders.find((o) => o.id === message.orderId)
    : null;

  const lastNoticedAt = currentOrder?.lastNoticedAt || 0;
  const now = Date.now();
  const TEN_MINUTES_MS = 10 * 60 * 1000;
  const canNoticeAdmin = now - lastNoticedAt >= TEN_MINUTES_MS;
  const minutesLeft = Math.ceil((TEN_MINUTES_MS - (now - lastNoticedAt)) / (60 * 1000));

  const handleCopy = () => {
    navigator.clipboard.writeText(displayBody || rawContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleConfirmClose = async () => {
    setIsDismissing(true);
    try {
      await onDismiss(message.id, clientToken);
    } catch {
      alert("Failed to acknowledge message.");
    } finally {
      setIsDismissing(false);
    }
  };

  const handleNoticeAdmin = async () => {
    if (!message.orderId || !clientToken) return;
    if (!canNoticeAdmin) {
      alert(`You can only alert admin once every 10 minutes. Please wait ${minutesLeft} more minute(s).`);
      return;
    }

    setIsNoticingAdmin(true);
    setNoticeSuccess(null);

    try {
      const res = await fetch("/api/orders/notice-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: message.orderId,
          clientToken,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to alert admin");

      updateOrderLastNoticed(message.orderId, Date.now());
      setNoticeSuccess("Admin alerted on Telegram!");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error notifying admin");
    } finally {
      setIsNoticingAdmin(false);
    }
  };

  // Border & header themes based on status code
  let borderColor = "border-rose-500";
  let headerBg = "bg-rose-600/30 border-rose-500 text-rose-400";
  let title = "ADMIN DELIVERY";
  let badgeText = "EPHEMERAL";
  let badgeColor = "bg-rose-500 text-slate-950";

  if (isGlobal) {
    borderColor = "border-amber-500";
    headerBg = "bg-amber-600/30 border-amber-500 text-amber-400";
    title = "STORE ANNOUNCEMENT";
    badgeText = "BROADCAST";
    badgeColor = "bg-amber-400 text-slate-950";
  } else if (isCode1Success) {
    borderColor = "border-emerald-500";
    headerBg = "bg-emerald-600/30 border-emerald-500 text-emerald-400";
    title = "PAYMENT CONFIRMED (SUCCESS)";
    badgeText = "VERIFIED";
    badgeColor = "bg-emerald-400 text-slate-950 font-bold";
  } else if (isCode0Failed) {
    borderColor = "border-rose-600";
    headerBg = "bg-rose-950 border-rose-600 text-rose-400";
    title = "PAYMENT NOT SUCCESSFUL";
    badgeText = "REJECTED";
    badgeColor = "bg-rose-600 text-white font-bold";
  } else if (isCode2Verify) {
    borderColor = "border-amber-500";
    headerBg = "bg-amber-600/30 border-amber-500 text-amber-400";
    title = "PAYMENT NEEDS VERIFICATION";
    badgeText = "UNDER REVIEW";
    badgeColor = "bg-amber-400 text-slate-950 font-bold";
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className={`w-full max-w-lg bg-[#121524] border-2 ${borderColor} p-6 shadow-2xl relative my-8 shadow-pixel-lg`}>
        {/* Header */}
        <div className="flex items-start gap-3.5 pb-4 border-b-2 border-slate-700 bg-[#0e111f] -mx-6 -mt-6 p-4 mb-4">
          <div className={`w-9 h-9 ${headerBg} border flex items-center justify-center shrink-0`}>
            {isGlobal ? (
              <Radio className="w-5 h-5" />
            ) : isCode1Success ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : isCode0Failed ? (
              <XCircle className="w-5 h-5" />
            ) : isCode2Verify ? (
              <HelpCircle className="w-5 h-5" />
            ) : (
              <ShieldAlert className="w-5 h-5" />
            )}
          </div>
          <div>
            <h3 className="font-pixel text-xs text-white tracking-wider flex items-center gap-2">
              <span>{title}</span>
              <span className={`font-pixel text-[8px] px-1.5 py-0.5 ${badgeColor}`}>
                {badgeText}
              </span>
            </h3>
            <p className="font-pixel text-[9px] text-emerald-400 mt-1">
              {isGlobal ? "BROADCAST TO ALL USERS" : `ORDER ID: ${message.publicMemo}`}
            </p>
          </div>
        </div>

        {/* Status Banners */}
        {isCode1Success && (
          <div className="my-4 bg-emerald-950/60 border-2 border-emerald-500 p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-300 font-pixel text-[9px]">
              <Check className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
              <span>TRANSACTION MATCHED & APPROVED</span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed">
              Your payment has been successfully confirmed by the store operator.
            </p>
          </div>
        )}

        {isCode0Failed && (
          <div className="my-4 bg-rose-950/60 border-2 border-rose-600 p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 text-rose-300 font-pixel text-[9px]">
              <XCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
              <span>PAYMENT REJECTED OR NOT FOUND</span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed">
              We could not verify your transfer. Please check if you entered the exact Order Memo <strong>{message.publicMemo}</strong> in transfer content.
            </p>
          </div>
        )}

        {isCode2Verify && (
          <div className="my-4 bg-amber-950/60 border-2 border-amber-500 p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 text-amber-300 font-pixel text-[9px]">
              <Clock className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              <span>MANUAL VERIFICATION REQUIRED</span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed">
              Operator is manually verifying transaction details on banking app. Please keep this window open or notice admin.
            </p>
          </div>
        )}

        {/* Message Content Container */}
        <div className="bg-[#0d0f18] border-2 border-slate-700 p-3.5 relative">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="font-pixel text-[9px] text-slate-400 flex items-center gap-1.5">
              <MessageSquare className="w-3 h-3 text-emerald-400" />
              <span>DETAILS:</span>
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 font-pixel text-[9px] px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold border border-emerald-300 shadow-pixel-sm active:translate-y-0.5 transition"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? "COPIED!" : "COPY"}</span>
            </button>
          </div>

          <pre className="font-mono text-xs text-emerald-300 whitespace-pre-wrap break-all select-all leading-relaxed bg-[#161a2e] p-3 border border-slate-800">
            {displayBody || (isCode1Success ? "Items dispatched. Thank you for your order!" : isCode0Failed ? "Payment not matched." : "Verification in progress.")}
          </pre>
        </div>

        {/* Action Controls */}
        <div className="mt-5 pt-3 border-t-2 border-slate-800 space-y-2.5">
          {/* Notice Admin Button (Active if payment succeeded or order message exists) */}
          {!isGlobal && isCode1Success && (
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={handleNoticeAdmin}
                disabled={isNoticingAdmin || !canNoticeAdmin}
                className="w-full flex items-center justify-center gap-2 bg-[#1a1e36] hover:bg-[#252b4d] text-emerald-400 border-2 border-emerald-500/50 hover:border-emerald-400 font-pixel text-[10px] py-2.5 px-4 shadow-pixel-sm active:translate-y-0.5 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {isNoticingAdmin
                    ? "DISPATCHING NOTICE..."
                    : canNoticeAdmin
                    ? "NOTICE OPERATOR ON TELEGRAM"
                    : `NOTICE SENT (WAIT ${minutesLeft}M)`}
                </span>
              </button>

              {noticeSuccess && (
                <p className="text-[10px] text-center text-emerald-400 font-pixel">
                  ✓ {noticeSuccess}
                </p>
              )}
            </div>
          )}

          <button
            onClick={handleConfirmClose}
            disabled={isDismissing}
            className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-pixel text-xs py-3 px-4 border-2 border-emerald-300 shadow-pixel-sm active:translate-y-0.5 transition disabled:opacity-50 font-bold"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isDismissing ? "CLOSING..." : "I SAVED IT — CLOSE & DISMISS"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}


