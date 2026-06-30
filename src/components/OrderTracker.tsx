/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { OrderStatus, CartItem } from "../types";
import { Coffee, Flame, ClipboardCheck, Play, ArrowRight, Sparkles } from "lucide-react";

interface OrderTrackerProps {
  status: OrderStatus;
  items: CartItem[];
  tableNumber: string;
  onAdvanceStatus: () => void;
}

export default function OrderTracker({
  status,
  items,
  tableNumber,
  onAdvanceStatus,
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
  ];

  const getStatusIndex = (currStatus: OrderStatus) => {
    if (currStatus === "Received") return 0;
    if (currStatus === "Preparing") return 1;
    return 2;
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
    return "bg-stone-100";
  };

  return (
    <div className="bg-stone-900 text-white rounded-3xl p-6 shadow-xl border border-stone-850" id="order-tracker">
      <div className="flex items-center justify-between mb-6 border-b border-stone-800 pb-4">
        <div>
          <span className="text-[10px] font-mono tracking-widest text-gold-400 uppercase font-bold">
            Live Order Status
          </span>
          <h3 className="text-lg font-display font-bold text-stone-100 mt-0.5">
            Table {tableNumber || "07"}
          </h3>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-mono text-stone-400 block">Current Stage</span>
          <span className="text-xs font-mono font-bold text-gold-300 bg-gold-950/50 px-3 py-1 rounded-full border border-gold-900/40 uppercase">
            {status}
          </span>
        </div>
      </div>

      {/* Visual Timeline Bar */}
      <div className="relative flex flex-col gap-6 pl-8 mb-6 mt-4">
        {statuses.map((s, idx) => {
          const Icon = s.icon;
          const isDone = idx < currentIndex;
          const isActive = idx === currentIndex;

          return (
            <div key={s.label} className="relative flex items-start gap-4">
              {/* Connecting line */}
              {idx < statuses.length - 1 && (
                <div
                  className={`absolute left-[-21px] top-6 w-0.5 h-12 ${getStatusLineColor(
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
                  className={`font-display text-sm font-bold flex items-center gap-2 transition-colors duration-300 ${
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

      {/* Dynamic Ambiance/Cook Note */}
      <div className="bg-stone-850/50 p-4 rounded-2xl border border-stone-800/40 text-xs text-stone-300 leading-relaxed font-light flex items-start gap-2.5">
        <Sparkles className="w-4 h-4 text-gold-400 shrink-0 mt-0.5" />
        <div>
          {status === "Received" && (
            <span>
              Your order has been logged into Toco's cloud terminal! The barista at our marble counter is currently reviewing your coffee selection.
            </span>
          )}
          {status === "Preparing" && (
            <span>
              <strong>Brewing & Baking:</strong> Steam is rising from our coffee machine against the sleek grey marble logo wall. Our baristas are frothing milk and applying 24k gold flakes!
            </span>
          )}
          {status === "Ready for Pickup / Serving" && (
            <span>
              <strong>Freshly Plated:</strong> Your selection is leaving our kitchen deck now. A Toco host is walking toward <strong>Table {tableNumber || "07"}</strong> with your fresh orders!
            </span>
          )}
        </div>
      </div>

      {/* Administrative kitchen simulator button to advance status */}
      {status !== "Ready for Pickup / Serving" && (
        <div className="mt-6 pt-4 border-t border-stone-800 flex justify-end">
          <button
            onClick={onAdvanceStatus}
            className="flex items-center gap-1.5 bg-stone-800 hover:bg-gold-600 text-stone-200 hover:text-stone-900 px-4 py-2 rounded-xl text-[11px] font-mono font-bold transition-all duration-300 shadow-md border border-stone-700/50"
          >
            <Play className="w-3 h-3" />
            Kitchen Speed-Up Sim
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
