"use client";

import { useState } from "react";
import { 
  AlertTriangle, 
  Copy, 
  Check, 
  MessageSquare, 
  ShieldAlert, 
  Bookmark,
  CheckCircle2
} from "lucide-react";
import { OrderMessageItem } from "./NotificationBell";

interface EphemeralMessageModalProps {
  isOpen: boolean;
  message: OrderMessageItem | null;
  clientToken: string | null;
  onDismiss: (messageId: string, clientToken: string) => Promise<void>;
}

export default function EphemeralMessageModal({
  isOpen,
  message,
  clientToken,
  onDismiss,
}: EphemeralMessageModalProps) {
  const [copied, setCopied] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  if (!isOpen || !message) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleConfirmClose = async () => {
    if (!clientToken) return;
    setIsDismissing(true);
    try {
      await onDismiss(message.id, clientToken);
    } catch {
      alert("Failed to acknowledge message.");
    } finally {
      setIsDismissing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-[#121524] border-2 border-rose-500 p-6 shadow-2xl relative my-8 shadow-pixel-lg">
        {/* Urgent Warning Header */}
        <div className="flex items-start gap-3.5 pb-4 border-b-2 border-slate-700 bg-[#0e111f] -mx-6 -mt-6 p-4 mb-4">
          <div className="w-9 h-9 bg-rose-600/30 border border-rose-500 flex items-center justify-center text-rose-400 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-pixel text-xs text-white tracking-wider flex items-center gap-2">
              <span>ADMIN DELIVERY</span>
              <span className="font-pixel text-[8px] px-1.5 py-0.5 bg-rose-500 text-slate-950">
                EPHEMERAL
              </span>
            </h3>
            <p className="font-pixel text-[9px] text-emerald-400 mt-1">ORDER ID: {message.publicMemo}</p>
          </div>
        </div>

        {/* Warning Callout Box */}
        <div className="my-4 bg-rose-950/60 border-2 border-rose-600 p-3.5 space-y-1.5">
          <div className="flex items-center gap-2 text-rose-400 font-pixel text-[9px]">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>WARNING: DISAPPEARS ON CLOSE!</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed">
            This message and credentials are one-time only. <strong>Copy or write down your details right now!</strong>
          </p>
        </div>

        {/* Message Content Container */}
        <div className="bg-[#0d0f18] border-2 border-slate-700 p-3.5 relative">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="font-pixel text-[9px] text-slate-400 flex items-center gap-1.5">
              <MessageSquare className="w-3 h-3 text-emerald-400" />
              <span>CONTENT:</span>
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 font-pixel text-[9px] px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold border border-emerald-300 shadow-pixel-sm active:translate-y-0.5 transition"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? "COPIED!" : "COPY ALL"}</span>
            </button>
          </div>

          <pre className="font-mono text-xs text-emerald-300 whitespace-pre-wrap break-all select-all leading-relaxed bg-[#161a2e] p-3 border border-slate-800">
            {message.content}
          </pre>
        </div>

        {/* Action Controls */}
        <div className="mt-5 pt-3 border-t-2 border-slate-800 space-y-2.5">
          <button
            onClick={handleConfirmClose}
            disabled={isDismissing}
            className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-pixel text-xs py-3 px-4 border-2 border-emerald-300 shadow-pixel-sm active:translate-y-0.5 transition disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isDismissing ? "CLOSING..." : "I SAVED IT — CLOSE & DISMISS"}</span>
          </button>

          <p className="text-[10px] text-center text-slate-500 flex items-center justify-center gap-1">
            <Bookmark className="w-3 h-3 text-amber-400" />
            <span>Data cannot be recovered after closing this window.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
