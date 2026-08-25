"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { 
  X, 
  Copy, 
  Check, 
  AlertTriangle, 
  Clock, 
  Wallet, 
  QrCode,
  ShieldCheck,
  Sparkles
} from "lucide-react";

export interface OrderDetails {
  id: string;
  publicMemo: string;
  clientToken: string;
  totalAmount: number;
  paymentMethod: "momo" | "binance";
  items: { id: string; name: string; price: number; quantity: number }[];
  status: string;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderDetails | null;
  onPaymentDone: (orderId: string) => Promise<void>;
}

export default function PaymentModal({
  isOpen,
  onClose,
  order,
  onPaymentDone,
}: PaymentModalProps) {
  const [selectedTab, setSelectedTab] = useState<"momo" | "binance">("momo");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isDoneSubmitting, setIsDoneSubmitting] = useState(false);
  const [isCompletedView, setIsCompletedView] = useState(false);

  if (!isOpen || !order) return null;

  const momoPhone = process.env.NEXT_PUBLIC_MOMO_PHONE || "0987654321";
  const momoName = process.env.NEXT_PUBLIC_MOMO_NAME || "STORE ADMIN";
  const binancePayId = process.env.NEXT_PUBLIC_BINANCE_PAY_ID || "987654321";

  // MoMo QR payload standard (or VietQR standard string)
  // Format: 2|99|0987654321|STORE ADMIN||0|0|amount|publicMemo|transfer_p2p
  const momoPayload = `2|99|${momoPhone}|${momoName}||0|0|${Math.round(order.totalAmount * 25000)}|${order.publicMemo}|transfer_p2p`;
  const binancePayload = `binance://pay?payeeId=${binancePayId}&amount=${order.totalAmount}&memo=${order.publicMemo}`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDoneClick = async () => {
    setIsDoneSubmitting(true);
    try {
      await onPaymentDone(order.id);
      setIsCompletedView(true);
    } catch {
      alert("Failed to submit payment confirmation. Please try again.");
    } finally {
      setIsDoneSubmitting(false);
    }
  };

  const handleCloseAndFinish = () => {
    setIsCompletedView(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Manual Payment Checkout</h3>
              <p className="text-xs text-slate-400 font-mono">Order ID: {order.publicMemo}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isCompletedView ? (
          /* Post-Done Confirmation Screen */
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto animate-bounce">
              <ShieldCheck className="w-8 h-8" />
            </div>

            <h4 className="text-lg font-bold text-white">Payment Notice Sent to Admin</h4>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-left space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs uppercase tracking-wider">
                <Clock className="w-4 h-4 shrink-0" />
                <span>Processing Time: 5 - 10 Minutes</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Your order information has been dispatched to our Telegram administration bot. Once our staff verifies the transfer, your credentials/delivery will arrive directly on this site.
              </p>
              <div className="pt-2 border-t border-amber-500/20 flex items-center gap-2 text-amber-300 text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Keep this browser tab open or check the notification bell icon above.</span>
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={handleCloseAndFinish}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/20 transition text-sm"
              >
                Return to Storefront
              </button>
            </div>
          </div>
        ) : (
          /* Payment Instructions & QR Screen */
          <div className="mt-5 space-y-5">
            {/* Payment Method Switcher */}
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-2xl border border-slate-800">
              <button
                onClick={() => setSelectedTab("momo")}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  selectedTab === "momo"
                    ? "bg-pink-600 text-white shadow-md shadow-pink-600/20"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>MoMo QR (VND)</span>
              </button>
              <button
                onClick={() => setSelectedTab("binance")}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  selectedTab === "binance"
                    ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Binance Pay ID (USD)</span>
              </button>
            </div>

            {/* QR Code Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col items-center justify-center text-center">
              <div className="bg-white p-3 rounded-2xl shadow-lg">
                <QRCodeSVG
                  value={selectedTab === "momo" ? momoPayload : binancePayload}
                  size={168}
                  level="M"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-3 font-medium">
                Scan with {selectedTab === "momo" ? "MoMo App" : "Binance App"}
              </p>
            </div>

            {/* Payment Details & Copy Helpers */}
            <div className="space-y-2.5">
              {/* Transfer Description / Memo (CRITICAL) */}
              <div className="bg-indigo-950/40 border border-indigo-500/40 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="block text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                    Required Transfer Memo (Description) *
                  </span>
                  <span className="font-mono text-sm font-extrabold text-white">
                    {order.publicMemo}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(order.publicMemo, "memo")}
                  className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600/50 hover:text-white transition"
                >
                  {copiedKey === "memo" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === "memo" ? "Copied" : "Copy"}</span>
                </button>
              </div>

              {/* Amount */}
              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="block text-[10px] uppercase font-semibold text-slate-400">
                    Payable Amount
                  </span>
                  <span className="font-bold text-sm text-emerald-400">
                    {selectedTab === "momo"
                      ? `${(order.totalAmount * 25000).toLocaleString("vi-VN")} VND`
                      : `$${order.totalAmount.toFixed(2)} USDT`}
                  </span>
                </div>
                <button
                  onClick={() =>
                    copyToClipboard(
                      selectedTab === "momo"
                        ? String(Math.round(order.totalAmount * 25000))
                        : String(order.totalAmount.toFixed(2)),
                      "amount"
                    )
                  }
                  className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition"
                >
                  {copiedKey === "amount" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === "amount" ? "Copied" : "Copy"}</span>
                </button>
              </div>

              {/* Account / Pay ID */}
              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="block text-[10px] uppercase font-semibold text-slate-400">
                    {selectedTab === "momo" ? `MoMo (${momoName})` : "Binance Pay ID"}
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-200">
                    {selectedTab === "momo" ? momoPhone : binancePayId}
                  </span>
                </div>
                <button
                  onClick={() =>
                    copyToClipboard(selectedTab === "momo" ? momoPhone : binancePayId, "account")
                  }
                  className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition"
                >
                  {copiedKey === "account" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === "account" ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            {/* Warning Callout */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-amber-300 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>
                Important: You <strong>must</strong> enter <strong>{order.publicMemo}</strong> into the transfer description/memo field so our bot can map your payment.
              </span>
            </div>

            {/* Done Action Button */}
            <button
              onClick={handleDoneClick}
              disabled={isDoneSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-emerald-600/20 active:scale-[0.99] transition text-sm disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isDoneSubmitting ? "Sending Payment Notice..." : "I Have Paid / Click for Done"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
