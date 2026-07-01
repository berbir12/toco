/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { OrderStatus, CartItem } from "../types";
import { Coffee, Flame, ClipboardCheck, CheckSquare, Sparkles } from "lucide-react";

interface OrderTrackerProps {
  status: OrderStatus;
  items: CartItem[];
  tableNumber: string;
}

export default function OrderTracker({
  status,
  items,
  tableNumber,
}: OrderTrackerProps) {
  const statuses: { label: OrderStatus; desc: string; icon: any }[] = [
    {
      label: "Received",
      desc: "Our baristas and chefs received your selections.",
      icon: ClipboardCheck,
    },
    {
      label: "Preparing",
      desc: "Baristas are steaming milk, and chefs are crafting your dishes.",
      icon: Flame,
    },
    {
      label: "Ready for Pickup / Serving",
      desc: "Fresh, hot delicacies are on their way to your table!",
      icon: Coffee,
    },
    {
      label: "Served & Completed",
      desc: "Order is successfully delivered. Thank you!",
      icon: CheckSquare,
    },
  ];

  const getStatusIndex = (currStatus: OrderStatus) => {
    if (currStatus === "Received") return 0;
    if (currStatus === "Preparing") return 1;
    if (currStatus === "Ready for Pickup / Serving") return 2;
    return 3;
  };

  const currentIndex = getStatusIndex(status);

  const getStatusColor = (index: number) => {
    if (index < currentIndex) {
      return "bg-gold-500 border-gold-500 text-white"; // Completed
    }
    if (index === currentIndex) {
      return "bg-stone-900 border-stone-900 text-gold-300 ring-4 ring-gold-200/50"; // Active
    }
    return "bg-white border-stone-200 text-stone-400"; // Future
  };

  const getStatusLineColor = (index: number) => {
    if (index < currentIndex) {
      return "bg-gold-500";
    }
    return "bg-stone-150";
  };

  return (
    <div className="bg-stone-900 text-white rounded-3xl p-6 shadow-xl border border-stone-850" id="order-tracker">
      <div className="flex items-center justify-between mb-6 border-b border-stone-800 pb-4">
        <div>
          <span className="text-[10px] font-mono tracking-widest text-gold-400 uppercase font-bold">
            Live Lounge Tracker
          </span>
          <h3 className="text-base font-display font-bold text-stone-100 mt-0.5 uppercase tracking-wide">
            Table {tableNumber || "07"}
          </h3>
        </div>
        <div className="text-right">
          <span className="text-[9px] font-mono text-stone-400 block uppercase">Current State</span>
          <span className="text-[10px] font-mono font-bold text-gold-300 bg-gold-950/40 px-3 py-1 rounded-full border border-gold-900/30 uppercase tracking-wide">
            {status}
          </span>
        </div>
      </div>

      {/* Visual Timeline Bar */}
      <div className="relative flex flex-col gap-5 pl-8 mb-5 mt-4">
        {statuses.map((s, idx) => {
          const Icon = s.icon;
          const isDone = idx < currentIndex;
          const isActive = idx === currentIndex;

          return (
            <div key={s.label} className="relative flex items-start gap-4">
              {/* Connecting line */}
              {idx < statuses.length - 1 && (
                <div
                  className={`absolute left-[-21px] top-6 w-0.5 h-11 ${getStatusLineColor(
                    idx
                  )}`}
                />
              )}

              {/* Status node bubble */}
              <div
                className={`absolute left-[-32px] w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-500 z-10 ${getStatusColor(
                  idx
                )}`}
              >
                {isDone ? (
                  <span className="text-[10px] font-bold">✓</span>
                ) : (
                  <span className="text-[9px] font-mono font-bold">{idx + 1}</span>
                )}
              </div>

              {/* Text info */}
              <div className="flex-1">
                <h4
                  className={`font-display text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors duration-300 ${
                    isActive ? "text-gold-200" : isDone ? "text-stone-300" : "text-stone-500"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "animate-pulse" : ""}`} />
                  {s.label}
                </h4>
                <p
                  className={`text-xs mt-1 leading-relaxed transition-colors duration-300 ${
                    isActive ? "text-stone-200 font-light" : "text-stone-500 font-light"
                  }`}
                >
                  {s.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dynamic Roastery State Note */}
      <div className="bg-stone-850/50 p-4 rounded-2xl border border-stone-800/40 text-[11px] text-stone-300 leading-relaxed font-light flex items-start gap-2.5">
        <Sparkles className="w-4 h-4 text-gold-400 shrink-0 mt-0.5 animate-pulse" />
        <div>
          {status === "Received" && (
            <span>
              Your selection is locked in. The barista is currently preparing the high-pressure espresso extraction against our sleek grey marble logo wall.
            </span>
          )}
          {status === "Preparing" && (
            <span>
              <strong>Crafting Live:</strong> Milk is being textured and organic ingredients are being mixed. The kitchen is placing microgreens on fresh sourdough toast.
            </span>
          )}
          {status === "Ready for Pickup / Serving" && (
            <span>
              <strong>On Its Way:</strong> Your gourmet dish and gold coffees have left the serving counter and are being brought to your table by our hospitality host!
            </span>
          )}
          {status === "Served & Completed" && (
            <span>
              <strong>Enjoy Your Feast:</strong> Served beautifully at <strong>Table {tableNumber || "07"}</strong>. Let our virtual host know if you need anything else!
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
