/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { CartItem } from "../types";
import { Trash2, Smartphone, CreditCard, Bell, Sparkles, CheckCircle2 } from "lucide-react";

interface CartDrawerProps {
  cart: CartItem[];
  onUpdateQuantity: (id: string, newQty: number) => void;
  onRemoveItem: (id: string) => void;
  onPlaceOrder: (tableNumber: string) => void;
  orderPlaced: boolean;
  orderPaid: boolean;
  onConfirmPayment: (method: string) => void;
  tableNumber: string;
  setTableNumber: (num: string) => void;
}

export default function CartDrawer({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onPlaceOrder,
  orderPlaced,
  orderPaid,
  onConfirmPayment,
  tableNumber,
  setTableNumber,
}: CartDrawerProps) {
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Bill Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const vat = subtotal * 0.10; // 10% VAT
  const serviceCharge = subtotal * 0.05; // 5% Service Charge
  const total = subtotal + vat + serviceCharge;

  const handlePay = (method: string) => {
    setPaymentMethod(method);
    setIsProcessing(true);

    // Simulate payment gateway loading
    setTimeout(() => {
      setIsProcessing(false);
      onConfirmPayment(method);
    }, 2000);
  };

  if (cart.length === 0 && !orderPlaced) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-stone-100 shadow-sm text-center py-16">
        <div className="w-16 h-16 bg-gold-50 text-gold-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-display font-bold text-stone-850 mb-2">Your Cart is Empty</h3>
        <p className="text-stone-400 text-sm max-w-xs mx-auto font-light">
          Browse our premium speciality coffees and gourmet signature dishes to begin your dining journey.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 border border-stone-100 shadow-xl flex flex-col justify-between" id="cart-drawer">
      {/* Table Number setup */}
      {!orderPlaced && (
        <div className="mb-6 flex items-center justify-between bg-stone-50 p-4 rounded-2xl border border-stone-100">
          <div>
            <label className="block text-[10px] font-mono tracking-widest text-stone-400 uppercase font-bold">
              Dining Location
            </label>
            <span className="text-sm font-display font-bold text-stone-800">Toco Table Lounge</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500 font-display">Table</span>
            <input
              type="text"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="07"
              className="w-12 h-9 bg-white border border-stone-200 text-center rounded-lg font-mono font-bold text-stone-800 focus:outline-none focus:ring-1 focus:ring-gold-500"
            />
          </div>
        </div>
      )}

      {/* Cart Content / Checkout Receipt */}
      <div className="space-y-6">
        <h3 className="text-xl font-serif font-semibold text-stone-900 border-b border-stone-50 pb-4 flex items-center justify-between">
          <span>{orderPlaced ? "Order Summary" : "Your Selection"}</span>
          <span className="text-xs font-mono bg-stone-100 text-stone-600 px-3 py-1 rounded-full">
            {cart.reduce((sum, item) => sum + item.quantity, 0)} items
          </span>
        </h3>

        {/* Cart Item List */}
        <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
          {cart.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
              <div className="flex-1">
                <div className="flex items-baseline justify-between gap-1">
                  <span className="font-display font-semibold text-stone-800">
                    {item.name}
                  </span>
                  <span className="text-stone-400 font-mono text-xs">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
                {item.customization && (item.customization.milk || item.customization.notes) && (
                  <div className="text-xs text-gold-600 font-display mt-0.5 italic flex flex-wrap gap-1">
                    {item.customization.milk && <span>• {item.customization.milk}</span>}
                    {item.customization.notes && <span>• "{item.customization.notes}"</span>}
                  </div>
                )}
                {/* Qty edit when NOT ordered */}
                {!orderPlaced && (
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center border border-stone-200 rounded-lg overflow-hidden bg-stone-50">
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                        className="px-2 py-0.5 text-stone-500 hover:bg-stone-200"
                      >
                        -
                      </button>
                      <span className="px-2 font-mono text-xs font-bold text-stone-700">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        className="px-2 py-0.5 text-stone-500 hover:bg-stone-200"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="text-stone-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {/* Plain Quantity badge when ordered */}
                {orderPlaced && (
                  <span className="inline-block mt-1 text-xs font-mono bg-stone-100 text-stone-600 px-2 py-0.5 rounded-sm">
                    Qty: {item.quantity}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Financial Itemized Breakdown */}
        <div className="border-t border-stone-100 pt-4 space-y-2">
          <div className="flex justify-between text-xs text-stone-500 font-display">
            <span>Subtotal</span>
            <span className="font-mono">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs text-stone-500 font-display">
            <span>VAT (10%)</span>
            <span className="font-mono">${vat.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs text-stone-500 font-display">
            <span>Service Charge (5%)</span>
            <span className="font-mono">${serviceCharge.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-display font-semibold text-stone-900 pt-2 border-t border-dashed border-stone-200">
            <span>Total Bill</span>
            <span className="font-mono text-gold-700 text-base">${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Payment Actions / Checkout Phase */}
      <div className="mt-8 pt-4 border-t border-stone-150">
        {/* Scenario 1: Order not placed yet */}
        {!orderPlaced && (
          <button
            onClick={() => onPlaceOrder(tableNumber)}
            className="w-full bg-stone-900 text-gold-200 hover:bg-stone-850 py-3.5 rounded-2xl font-display font-bold text-sm tracking-wide shadow-lg transition-all duration-300"
          >
            Confirm & Send to Kitchen
          </button>
        )}

        {/* Scenario 2: Order Placed but NOT Paid */}
        {orderPlaced && !orderPaid && (
          <div className="space-y-3">
            <h4 className="text-xs font-display font-semibold uppercase tracking-wider text-stone-500">
              Settle the Bill ({tableNumber ? `Table ${tableNumber}` : "Lounge"})
            </h4>

            {isProcessing ? (
              <div className="bg-stone-50 py-6 rounded-2xl border border-stone-100 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-4 border-gold-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-display font-medium text-stone-600 animate-pulse">
                  Connecting to secure Toco Terminal...
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => handlePay("Google Pay")}
                  className="flex items-center justify-between bg-stone-950 text-white hover:bg-stone-850 p-3 rounded-xl border border-stone-800 transition-colors text-xs font-display font-medium"
                >
                  <span className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-gold-300" />
                    Pay with Google Pay
                  </span>
                  <span className="font-mono text-[10px] text-stone-400">Instant</span>
                </button>

                <button
                  onClick={() => handlePay("Credit/Debit Link")}
                  className="flex items-center justify-between bg-white text-stone-800 hover:bg-stone-50 p-3 rounded-xl border border-stone-200 transition-colors text-xs font-display font-medium"
                >
                  <span className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-stone-500" />
                    Credit / Debit Card Link
                  </span>
                  <span className="font-mono text-[10px] text-stone-400">Secure</span>
                </button>

                <button
                  onClick={() => handlePay("Call Server")}
                  className="flex items-center justify-between bg-gold-50/50 text-gold-900 hover:bg-gold-50 p-3 rounded-xl border border-gold-200 transition-colors text-xs font-display font-medium"
                >
                  <span className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-gold-600" />
                    Bring Card Terminal to Table
                  </span>
                  <span className="font-mono text-[10px] text-gold-700">Call Staff</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Scenario 3: Order Placed AND Paid successfully */}
        {orderPaid && (
          <div className="bg-emerald-50 text-emerald-900 p-5 rounded-2xl border border-emerald-100 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-display font-bold text-sm">Transaction Secured</h4>
              <p className="text-xs text-emerald-700 mt-1 font-light leading-relaxed">
                Thank you! Your transaction of <strong>${total.toFixed(2)}</strong> via <strong>{paymentMethod}</strong> has been confirmed. A receipt is sent to your server terminal. Enjoy your dining experience!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
