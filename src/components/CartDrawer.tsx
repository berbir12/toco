/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { CartItem, Order } from "../types";
import { Trash2, Smartphone, CreditCard, Bell, Sparkles, CheckCircle2, Receipt, ShieldCheck, Heart } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CartDrawerProps {
  cart: CartItem[];
  onUpdateQuantity: (id: string, newQty: number) => void;
  onRemoveItem: (id: string) => void;
  onPlaceOrder: (tableNumber: string) => void;
  activeOrder: Order | null;
  onConfirmPayment: (method: string) => void;
  onPayWithChapa: () => Promise<void>;
  tableNumber: string;
  setTableNumber: (num: string) => void;
}

export default function CartDrawer({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onPlaceOrder,
  activeOrder,
  onConfirmPayment,
  onPayWithChapa,
  tableNumber,
  setTableNumber,
}: CartDrawerProps) {
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isChapaLoading, setIsChapaLoading] = useState<boolean>(false);
  const [tipPercentage, setTipPercentage] = useState<number>(15);

  // Bill Calculations for Cart
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const vat = subtotal * 0.10; // 10% VAT
  const serviceCharge = subtotal * (tipPercentage / 100); // Dynamic Tip/Service Charge
  const total = subtotal + vat + serviceCharge;

  // Bill calculations for Active Order if placed
  const orderSubtotal = activeOrder?.subtotal || 0;
  const orderVat = activeOrder?.vat || 0;
  const orderServiceCharge = activeOrder?.serviceCharge || 0;
  const orderTotal = activeOrder?.total || 0;

  const handlePay = (method: string) => {
    setPaymentMethod(method);
    setIsProcessing(true);

    // Simulate luxury payment gateway connection
    setTimeout(() => {
      setIsProcessing(false);
      onConfirmPayment(method);
    }, 2200);
  };

  const activeSubtotal = activeOrder ? orderSubtotal : subtotal;
  const activeVat = activeOrder ? orderVat : vat;
  const activeServiceCharge = activeOrder ? orderServiceCharge : serviceCharge;
  const activeTotal = activeOrder ? orderTotal : total;

  if (cart.length === 0 && !activeOrder) {
    return (
      <div className="bg-[#FDFBF7] rounded-[2rem] p-8 border border-[#E9E4DB] shadow-sm text-center py-12 paper-grid relative">
        <div className="absolute inset-2 rounded-[1.6rem] border border-dashed border-[#E9E4DB] pointer-events-none" />
        <div className="w-12 h-12 bg-white text-gold-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-stone-100">
          <Sparkles className="w-5 h-5" />
        </div>
        <h3 className="text-xs font-serif font-black uppercase tracking-[0.2em] text-stone-900 mb-1">Selections Empty</h3>
        <p className="text-stone-400 text-[11px] max-w-[210px] mx-auto font-light leading-relaxed">
          Ask our virtual concierge to customize an award-winning pairing for you.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#FDFBF7] rounded-[2rem] p-6 border border-[#E9E4DB] shadow-lg flex flex-col justify-between paper-grid relative overflow-hidden" id="cart-drawer">
      
      {/* Dashed outer decorative board */}
      <div className="absolute inset-2.5 rounded-[1.5rem] border border-dashed border-[#E9E4DB] pointer-events-none z-0" />

      <div className="relative z-10 space-y-6">
        
        {/* Table Number setup */}
        {!activeOrder && (
          <div className="flex items-center justify-between bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-stone-150 shadow-xs">
            <div>
              <span className="text-[9px] font-mono tracking-widest text-stone-400 uppercase font-bold block">
                Dining Seat Link
              </span>
              <span className="text-xs font-serif font-bold text-stone-950 block mt-0.5">
                Toco Counter Setup
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-stone-600">Table</span>
              <input
                type="text"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="07"
                className="w-12 h-9 bg-[#FDFBF7] border border-stone-200 text-center rounded-xl font-mono font-bold text-stone-950 focus:outline-none focus:ring-1 focus:ring-gold-500"
              />
            </div>
          </div>
        )}

        {/* Vintage Cashier Ticket Container */}
        <div className="bg-white/95 rounded-[1.8rem] p-5 border border-stone-200/60 shadow-xs relative">
          
          <div className="flex items-center justify-between border-b border-dashed border-stone-200 pb-3 mb-4">
            <span className="flex items-center gap-1.5 uppercase tracking-widest text-[10px] font-mono text-stone-500 font-bold">
              <Receipt className="w-3.5 h-3.5 text-gold-600" />
              {activeOrder ? "CASH REGISTER TICKET" : "PENDING COFFEE TAB"}
            </span>
            <span className="text-[10px] font-mono bg-stone-100 text-stone-600 px-2 py-0.5 rounded font-bold">
              No. 2026-B
            </span>
          </div>

          {/* Cart Item Rows */}
          <div className="space-y-4 max-h-56 overflow-y-auto pr-1">
            {activeOrder ? (
              activeOrder.items.map((item) => (
                <div key={item.id} className="text-xs">
                  <div className="flex items-baseline justify-between gap-1.5">
                    <span className="font-sans font-bold text-stone-950">
                      {item.name} <span className="text-stone-400 font-normal">x{item.quantity}</span>
                    </span>
                    <span className="text-stone-800 font-mono font-semibold">
                      {(item.price * item.quantity).toFixed(2)} ETB
                    </span>
                  </div>
                  {item.customization && (item.customization.milk || item.customization.notes) && (
                    <div className="text-[9px] text-gold-600 font-sans mt-0.5 font-medium italic">
                      {item.customization.milk && <span>• {item.customization.milk} </span>}
                      {item.customization.notes && <span>• "{item.customization.notes}"</span>}
                    </div>
                  )}
                </div>
              ))
            ) : (
              cart.map((item) => (
                <div key={item.id} className="text-xs">
                  <div className="flex items-baseline justify-between gap-1.5">
                    <span className="font-sans font-bold text-stone-950">
                      {item.name}
                    </span>
                    <span className="text-stone-800 font-mono font-semibold">
                      {(item.price * item.quantity).toFixed(2)} ETB
                    </span>
                  </div>
                  
                  {item.customization && (item.customization.milk || item.customization.notes) && (
                    <div className="text-[9px] text-gold-600 font-sans mt-0.5 font-medium italic">
                      {item.customization.milk && <span>• {item.customization.milk} </span>}
                      {item.customization.notes && <span>• "{item.customization.notes}"</span>}
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center border border-stone-200 rounded-lg overflow-hidden bg-[#FDFBF7]">
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                        className="px-2 py-0.5 text-stone-500 hover:bg-stone-100 text-xs font-bold cursor-pointer"
                      >
                        -
                      </button>
                      <span className="px-2 font-mono text-xs font-bold text-stone-800">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        className="px-2 py-0.5 text-stone-500 hover:bg-stone-100 text-xs font-bold cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="text-stone-400 hover:text-red-500 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Luxury Interactive Tip / Gratitude Selector */}
          {!activeOrder && (
            <div className="mt-4 pt-3 border-t border-stone-100">
              <span className="text-[9px] font-mono tracking-widest text-stone-400 uppercase font-bold block mb-2 text-center">
                ADD SOMETHING FOR THE BARISTAS
              </span>
              <div className="grid grid-cols-4 gap-1 p-0.5 bg-[#FAF8F5] rounded-xl border border-stone-150">
                {[10, 15, 20, 25].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setTipPercentage(pct)}
                    className={`py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                      tipPercentage === pct
                        ? "bg-stone-950 text-gold-200 shadow-sm"
                        : "text-stone-500 hover:text-stone-900 hover:bg-stone-100"
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Dotted Connection Tear Area */}
          <div className="relative my-4 flex items-center justify-between text-[#E9E4DB]">
            <div className="w-3 h-6 bg-[#FAF8F5] rounded-r-full -ml-8 border border-stone-200 border-l-transparent" />
            <div className="flex-1 border-b border-dashed border-[#E9E4DB] mx-2" />
            <div className="w-3 h-6 bg-[#FAF8F5] rounded-l-full -mr-8 border border-stone-200 border-r-transparent" />
          </div>

          {/* Breakdown calculations */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-stone-500 font-sans">
              <span>Subtotal</span>
              <span className="font-mono text-stone-700">{activeSubtotal.toFixed(2)} ETB</span>
            </div>
            <div className="flex justify-between text-xs text-stone-500 font-sans">
              <span>VAT (10%)</span>
              <span className="font-mono text-stone-700">{activeVat.toFixed(2)} ETB</span>
            </div>
            <div className="flex justify-between text-xs text-stone-500 font-sans">
              <span>Gratitude / Tip ({activeOrder ? "Included" : `${tipPercentage}%`})</span>
              <span className="font-mono text-stone-700">{activeServiceCharge.toFixed(2)} ETB</span>
            </div>
            <div className="flex justify-between text-sm font-serif font-black text-stone-950 pt-2 border-t border-stone-150">
              <span>Grand Total</span>
              <span className="font-mono text-base text-gold-700">
                {activeTotal.toFixed(2)} ETB
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* Payment Gateway Actions */}
      <div className="mt-6 relative z-10">
        {!activeOrder && (
          <button
            onClick={() => onPlaceOrder(tableNumber)}
            className="w-full bg-stone-950 text-gold-200 hover:bg-gold-600 hover:text-stone-950 py-3.5 rounded-xl font-sans font-bold text-xs uppercase tracking-widest shadow-lg transition-all duration-300 cursor-pointer border border-stone-900 sheen-effect"
          >
            Transmit Tab to Kitchen
          </button>
        )}

        {activeOrder && !activeOrder.paymentConfirmed && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono tracking-widest text-stone-400 uppercase font-black">
                SELECT TERMINAL
              </span>
              <span className="flex items-center gap-1 text-[9px] text-emerald-600 font-semibold font-mono">
                <ShieldCheck className="w-3 h-3" /> SECURE NFC
              </span>
            </div>

            {isProcessing || isChapaLoading ? (
              <div className="bg-white py-6 rounded-2xl border border-stone-200 flex flex-col items-center justify-center gap-2">
                <div className="w-6 h-6 border-2 border-gold-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-[11px] font-sans font-medium text-stone-500 animate-pulse uppercase tracking-wider">
                  {isChapaLoading ? "Opening Chapa Secure Gateway..." : "Contacting Bank..."}
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  onClick={async () => {
                    setIsChapaLoading(true);
                    try {
                      await onPayWithChapa();
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setIsChapaLoading(false);
                    }
                  }}
                  className="flex items-center justify-between bg-gradient-to-r from-[#5a3f9c] to-[#452c80] hover:from-[#4d3289] hover:to-[#381f6d] text-white p-3.5 rounded-xl transition-all text-xs font-sans font-black uppercase tracking-wider cursor-pointer border border-[#452c80] shadow-md hover:scale-101"
                >
                  <span className="flex items-center gap-2">
                    <span className="flex gap-0.5 items-center bg-white/10 px-1.5 py-0.5 rounded text-[8px] font-bold text-yellow-300 border border-white/5">
                      🇪🇹 ETB
                    </span>
                    Pay with Chapa (Mobile)
                  </span>
                  <span className="font-mono text-[9px] text-gold-300 tracking-wider font-extrabold bg-black/20 px-2 py-0.5 rounded-full">RECOMMENDED</span>
                </button>

                <button
                  onClick={() => handlePay("Google Pay")}
                  className="flex items-center justify-between bg-stone-950 text-white hover:bg-stone-900 p-3 rounded-xl transition-colors text-xs font-sans font-bold uppercase tracking-wider cursor-pointer border border-stone-900"
                >
                  <span className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-gold-300" />
                    Google Pay
                  </span>
                  <span className="font-mono text-[9px] text-gold-400 tracking-wider">INSTANT</span>
                </button>

                <button
                  onClick={() => handlePay("Credit Link")}
                  className="flex items-center justify-between bg-white text-stone-800 hover:bg-stone-50 p-3 rounded-xl transition-colors text-xs font-sans font-bold uppercase tracking-wider cursor-pointer border border-stone-200 shadow-xs"
                >
                  <span className="flex items-center gap-2 text-stone-900">
                    <CreditCard className="w-4 h-4 text-stone-500" />
                    Credit Card
                  </span>
                  <span className="font-mono text-[9px] text-stone-400 tracking-wider">TAP</span>
                </button>

                <button
                  onClick={() => handlePay("Call Server")}
                  className="flex items-center justify-between bg-gold-50 text-gold-950 hover:bg-gold-100 p-3 rounded-xl transition-colors text-xs font-sans font-bold uppercase tracking-wider cursor-pointer border border-gold-200/50"
                >
                  <span className="flex items-center gap-2 text-gold-900">
                    <Bell className="w-4 h-4 text-gold-600" />
                    Request Waiter / Terminal
                  </span>
                  <span className="font-mono text-[9px] text-gold-600">CALL</span>
                </button>
              </div>
            )}
          </div>
        )}

        {activeOrder && activeOrder.paymentConfirmed && (
          <div className="bg-emerald-50 text-emerald-950 p-4 rounded-xl border border-emerald-100 flex items-start gap-3">
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-sans font-bold text-xs uppercase tracking-wide text-stone-900">Transaction Approved</h4>
              <p className="text-[11px] text-emerald-800 mt-1 font-light leading-relaxed">
                Bill settled for <strong>{orderTotal.toFixed(2)} ETB</strong> via <strong>{activeOrder.paymentMethod || "Apple Pay"}</strong>. It has been registered on our ledgers.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
