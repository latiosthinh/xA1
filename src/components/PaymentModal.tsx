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
      <div className="w-full max-w-lg bg-[#121524] border-2 border-slate-700 p-6 shadow-2xl relative my-8 shadow-pixel-lg">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b-2 border-slate-700 bg-[#0e111f] -mx-6 -mt-6 p-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-500 border border-emerald-300 flex items-center justify-center text-slate-950">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-pixel text-xs text-white tracking-wider">PAYMENT CHECKOUT</h3>
              <p className="font-pixel text-[9px] text-emerald-400 mt-0.5">ID: {order.publicMemo}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isCompletedView ? (
          /* Post-Done Confirmation Screen */
          <div className="py-4 text-center space-y-4">
            <div className="w-12 h-12 bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <h4 className="font-pixel text-xs text-white">PAYMENT NOTICE DISPATCHED!</h4>

            <div className="bg-[#161a2e] border-2 border-amber-500/40 p-3.5 text-left space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-pixel text-[10px]">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>TIME: 5 - 10 MINUTES</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Order details sent to Telegram bot. Credentials will arrive directly in your browser.
              </p>
              <div className="pt-2 border-t border-slate-800 flex items-center gap-2 text-emerald-300 text-xs">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>Keep this tab open or watch the notification bell icon.</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleCloseAndFinish}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-pixel text-xs py-3 px-4 border-2 border-emerald-300 shadow-pixel-sm active:translate-y-0.5 transition"
              >
                RETURN TO STORE
              </button>
            </div>
          </div>
        ) : (
          /* Payment Instructions & QR Screen */
          <div className="space-y-4">
            {/* Payment Method Switcher */}
            <div className="grid grid-cols-2 gap-2 bg-[#0e111f] p-1 border-2 border-slate-700">
              <button
                onClick={() => setSelectedTab("momo")}
                className={`py-2 px-3 text-[10px] font-pixel transition flex items-center justify-center gap-1.5 ${
                  selectedTab === "momo"
                    ? "bg-pink-600 text-white border border-pink-400"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Wallet className="w-3 h-3" />
                <span>MoMo QR</span>
              </button>
              <button
                onClick={() => setSelectedTab("binance")}
                className={`py-2 px-3 text-[10px] font-pixel transition flex items-center justify-center gap-1.5 ${
                  selectedTab === "binance"
                    ? "bg-amber-500 text-slate-950 border border-amber-300 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <QrCode className="w-3 h-3" />
                <span>Binance ID</span>
              </button>
            </div>

            {/* QR Code Card */}
            <div className="bg-[#0d0f18] border-2 border-slate-700 p-4 flex flex-col items-center justify-center text-center">
              <div className="bg-white p-2 border-2 border-slate-400 shadow-md">
                <QRCodeSVG
                  value={selectedTab === "momo" ? momoPayload : binancePayload}
                  size={150}
                  level="M"
                />
              </div>
              <p className="font-pixel text-[9px] text-slate-400 mt-2.5">
                Scan with {selectedTab === "momo" ? "MoMo" : "Binance"} App
              </p>
            </div>

            {/* Payment Details & Copy Helpers */}
            <div className="space-y-2">
              {/* Transfer Description / Memo */}
              <div className="bg-[#161a2e] border-2 border-emerald-500/50 p-2.5 flex items-center justify-between">
                <div>
                  <span className="block font-pixel text-[8px] text-emerald-400 uppercase">
                    Required Transfer Memo *
                  </span>
                  <span className="font-pixel text-xs font-bold text-white">
                    {order.publicMemo}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(order.publicMemo, "memo")}
                  className="flex items-center gap-1 font-pixel text-[9px] px-2 py-1 bg-emerald-500/20 border border-emerald-400 text-emerald-300 hover:bg-emerald-500/40 transition"
                >
                  {copiedKey === "memo" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === "memo" ? "COPIED" : "COPY"}</span>
                </button>
              </div>

              {/* Amount */}
              <div className="bg-[#0e111f] border border-slate-700 p-2.5 flex items-center justify-between">
                <div>
                  <span className="block font-pixel text-[8px] text-slate-400 uppercase">
                    Payable Amount
                  </span>
                  <span className="font-pixel text-xs text-emerald-400">
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
                  className="flex items-center gap-1 font-pixel text-[9px] px-2 py-1 bg-slate-800 border border-slate-600 text-slate-300 hover:text-white transition"
                >
                  {copiedKey === "amount" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === "amount" ? "COPIED" : "COPY"}</span>
                </button>
              </div>

              {/* Account / Pay ID */}
              <div className="bg-[#0e111f] border border-slate-700 p-2.5 flex items-center justify-between">
                <div>
                  <span className="block font-pixel text-[8px] text-slate-400 uppercase">
                    {selectedTab === "momo" ? `MoMo (${momoName})` : "Binance Pay ID"}
                  </span>
                  <span className="font-pixel text-[10px] text-slate-200">
                    {selectedTab === "momo" ? momoPhone : binancePayId}
                  </span>
                </div>
                <button
                  onClick={() =>
                    copyToClipboard(selectedTab === "momo" ? momoPhone : binancePayId, "account")
                  }
                  className="flex items-center gap-1 font-pixel text-[9px] px-2 py-1 bg-slate-800 border border-slate-600 text-slate-300 hover:text-white transition"
                >
                  {copiedKey === "account" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === "account" ? "COPIED" : "COPY"}</span>
                </button>
              </div>
            </div>

            {/* Warning Callout */}
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 flex items-start gap-2 text-amber-300 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>
                Enter <strong>{order.publicMemo}</strong> into transfer description for automatic bot matching.
              </span>
            </div>

            {/* Done Action Button */}
            <button
              onClick={handleDoneClick}
              disabled={isDoneSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-pixel text-xs py-3 px-4 border-2 border-emerald-300 shadow-pixel-sm active:translate-y-0.5 transition disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isDoneSubmitting ? "SENDING NOTICE..." : "I HAVE PAID / DONE"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
