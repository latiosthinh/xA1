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
      <div className="w-full max-w-lg bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 sm:p-7 shadow-2xl relative my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Urgent Warning Header */}
        <div className="flex items-start gap-3.5 pb-4 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/10">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>Admin Delivery Response</span>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Ephemeral
              </span>
            </h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">Order ID: {message.publicMemo}</p>
          </div>
        </div>

        {/* Warning Callout Box */}
        <div className="my-5 bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>CRITICAL WARNING: DATA WILL DISAPPEAR</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed font-medium">
            This message and its credentials are <strong>ephemeral</strong> and will be permanently removed from view once you close this modal. <strong>Please copy, write down, or store your details now!</strong>
          </p>
        </div>

        {/* Message Content Container */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 relative group">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80">
            <span className="text-[11px] font-semibold uppercase text-slate-400 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
              <span>Admin Message / Credentials</span>
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition active:scale-95"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied to Clipboard!" : "Copy All"}</span>
            </button>
          </div>

          <pre className="font-mono text-sm text-emerald-300 whitespace-pre-wrap break-all select-all leading-relaxed bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
            {message.content}
          </pre>
        </div>

        {/* Action Controls */}
        <div className="mt-6 pt-4 border-t border-slate-800 space-y-3">
          <button
            onClick={handleConfirmClose}
            disabled={isDismissing}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-600/20 active:scale-[0.99] transition text-sm disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isDismissing ? "Dismissing..." : "I Have Saved My Data — Close & Dismiss"}</span>
          </button>

          <p className="text-[11px] text-center text-slate-500 flex items-center justify-center gap-1">
            <Bookmark className="w-3 h-3" />
            <span>Make sure you backed up the code/details above before clicking close.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
