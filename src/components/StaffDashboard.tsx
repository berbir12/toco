/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Order, OrderStatus, TableConfig } from "../types";
import { Coffee, Flame, ClipboardCheck, CheckSquare, Clock, Filter, AlertCircle, ShoppingBag, Landmark, Users } from "lucide-react";

interface StaffDashboardProps {
  orders: Order[];
  tables: TableConfig[];
  onUpdateOrderStatus: (orderId: string, newStatus: OrderStatus) => void;
  onUpdatePaymentStatus: (orderId: string, paid: boolean) => void;
}

export default function StaffDashboard({
  orders,
  tables,
  onUpdateOrderStatus,
  onUpdatePaymentStatus,
}: StaffDashboardProps) {
  const [filter, setFilter] = useState<"all" | "active" | "completed">("active");
  const [selectedTableFilter, setSelectedTableFilter] = useState<string>("All");

  const filteredOrders = orders.filter((order) => {
    // Stage Filter
    if (filter === "active" && order.status === "Served & Completed") return false;
    if (filter === "completed" && order.status !== "Served & Completed") return false;

    // Table Filter
    if (selectedTableFilter !== "All" && order.tableNumber !== selectedTableFilter) return false;

    return true;
  });

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case "Received":
        return <ClipboardCheck className="w-4 h-4 text-amber-500" />;
      case "Preparing":
        return <Flame className="w-4 h-4 text-orange-500 animate-pulse" />;
      case "Ready for Pickup / Serving":
        return <Coffee className="w-4 h-4 text-gold-500" />;
      default:
        return <CheckSquare className="w-4 h-4 text-emerald-500" />;
    }
  };

  const getStatusBadgeClass = (status: OrderStatus) => {
    switch (status) {
      case "Received":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "Preparing":
        return "bg-orange-50 text-orange-800 border-orange-200";
      case "Ready for Pickup / Serving":
        return "bg-gold-50 text-gold-900 border-gold-300";
      default:
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
    }
  };

  // Stats calculation
  const activeOrdersCount = orders.filter(o => o.status !== "Served & Completed").length;
  const readyOrdersCount = orders.filter(o => o.status === "Ready for Pickup / Serving").length;
  const preparingCount = orders.filter(o => o.status === "Preparing").length;
  const totalCompletedToday = orders.filter(o => o.status === "Served & Completed").length;

  return (
    <div className="w-full space-y-8" id="staff-dashboard">
      {/* Upper Grid Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-stone-150 rounded-2xl p-5 shadow-xs">
          <span className="text-[10px] font-mono tracking-widest text-stone-400 uppercase font-bold">
            Total Active
          </span>
          <p className="text-2xl font-serif font-black text-stone-900 mt-1">{activeOrdersCount}</p>
          <span className="text-[10px] font-display font-medium text-amber-600 mt-1 block">
            Needs action from baristas
          </span>
        </div>

        <div className="bg-white border border-stone-150 rounded-2xl p-5 shadow-xs">
          <span className="text-[10px] font-mono tracking-widest text-stone-400 uppercase font-bold">
            Preparing State
          </span>
          <p className="text-2xl font-serif font-black text-orange-600 mt-1">{preparingCount}</p>
          <span className="text-[10px] font-display font-medium text-stone-400 mt-1 block">
            Crafting on marble bar
          </span>
        </div>

        <div className="bg-white border border-stone-150 rounded-2xl p-5 shadow-xs">
          <span className="text-[10px] font-mono tracking-widest text-stone-400 uppercase font-bold">
            Ready to Serve
          </span>
          <p className="text-2xl font-serif font-black text-gold-600 mt-1">{readyOrdersCount}</p>
          <span className="text-[10px] font-display font-medium text-stone-400 mt-1 block">
            At dispatch counter
          </span>
        </div>

        <div className="bg-stone-900 border border-stone-850 rounded-2xl p-5 shadow-xs text-white">
          <span className="text-[10px] font-mono tracking-widest text-gold-400 uppercase font-bold">
            Delivered Today
          </span>
          <p className="text-2xl font-serif font-black text-gold-300 mt-1">{totalCompletedToday}</p>
          <span className="text-[10px] font-display font-medium text-stone-400 mt-1 block">
            Successfully cleared
          </span>
        </div>
      </div>

      {/* Main Staff Interactive Console */}
      <div className="bg-white border border-stone-150 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-5 mb-6">
          <div>
            <h2 className="text-xl font-serif font-bold text-stone-900">
              Kitchen & Bar Dispatch
            </h2>
            <p className="text-xs text-stone-500 font-light mt-0.5">
              Advance order statuses and track table reservations in real-time.
            </p>
          </div>

          {/* Controls / Filter row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter stages */}
            <div className="flex items-center border border-stone-200 rounded-xl overflow-hidden p-1 bg-stone-50">
              <button
                onClick={() => setFilter("active")}
                className={`px-3 py-1.5 rounded-lg text-xs font-display font-bold uppercase tracking-wider transition-all ${
                  filter === "active"
                    ? "bg-stone-900 text-gold-300 shadow-sm"
                    : "text-stone-500 hover:text-stone-850"
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setFilter("completed")}
                className={`px-3 py-1.5 rounded-lg text-xs font-display font-bold uppercase tracking-wider transition-all ${
                  filter === "completed"
                    ? "bg-stone-900 text-gold-300 shadow-sm"
                    : "text-stone-500 hover:text-stone-850"
                }`}
              >
                Completed
              </button>
              <button
                onClick={() => setFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-display font-bold uppercase tracking-wider transition-all ${
                  filter === "all"
                    ? "bg-stone-900 text-gold-300 shadow-sm"
                    : "text-stone-500 hover:text-stone-850"
                }`}
              >
                All
              </button>
            </div>

            {/* Table Dropdown */}
            <select
              value={selectedTableFilter}
              onChange={(e) => setSelectedTableFilter(e.target.value)}
              className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-display font-semibold uppercase tracking-wider text-stone-600 focus:outline-none focus:ring-1 focus:ring-gold-500"
            >
              <option value="All">All Tables</option>
              {tables.map(t => (
                <option key={t.id} value={t.tableNumber}>Table {t.tableNumber}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Orders Log List */}
        <div className="space-y-6">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-stone-150 rounded-2xl bg-stone-50">
              <ShoppingBag className="w-10 h-10 text-stone-300 mx-auto mb-3" />
              <p className="text-stone-500 text-sm font-display font-bold uppercase tracking-wide">
                No orders matching filter
              </p>
              <p className="text-stone-400 text-xs mt-1">
                Incoming orders from the customer lounge will appear here instantly.
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div
                key={order.id}
                id={`staff-order-${order.id}`}
                className={`border rounded-2xl p-6 transition-all duration-300 ${
                  order.status === "Served & Completed"
                    ? "border-stone-150 bg-stone-50/50 opacity-80"
                    : order.status === "Ready for Pickup / Serving"
                    ? "border-gold-300/40 bg-gold-50/10 shadow-md ring-1 ring-gold-200"
                    : "border-stone-200 bg-white shadow-sm hover:shadow-md"
                }`}
              >
                {/* Order Top Card Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-serif font-extrabold text-stone-900 uppercase bg-stone-100 px-3 py-1 rounded-lg border border-stone-200">
                      Table {order.tableNumber}
                    </span>
                    <span className="text-[10px] font-mono text-stone-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {order.createdAt}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Payment badge toggle */}
                    <button
                      onClick={() => onUpdatePaymentStatus(order.id, !order.paymentConfirmed)}
                      className={`text-[10px] font-mono px-3 py-1 rounded-full border cursor-pointer font-bold ${
                        order.paymentConfirmed
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-red-50 text-red-800 border-red-200"
                      }`}
                    >
                      {order.paymentConfirmed ? "💰 BILL PAID" : "⚠️ UNPAID - CLICK TO PAY"}
                    </button>

                    {order.paymentMethod === "Call Server" && !order.paymentConfirmed && (
                      <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-amber-500 text-white font-black animate-pulse border border-amber-600 flex items-center gap-1">
                        🛎️ WAITER REQUESTED
                      </span>
                    )}

                    {/* Stage status indicator */}
                    <span className={`text-[10px] font-mono border px-3 py-1 rounded-full flex items-center gap-1.5 font-bold ${getStatusBadgeClass(order.status)}`}>
                      {getStatusIcon(order.status)}
                      {order.status}
                    </span>
                  </div>
                </div>

                {/* Items and customization breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  <div className="md:col-span-8 space-y-3">
                    {order.items.map((item) => (
                      <div key={item.id} className="text-xs text-stone-800 font-display">
                        <div className="flex items-baseline justify-between max-w-lg">
                          <span className="font-bold text-stone-900">
                            {item.name} <span className="text-stone-400 font-normal">x{item.quantity}</span>
                          </span>
                        </div>
                        {item.customization && (item.customization.milk || item.customization.notes) && (
                          <div className="text-[10px] text-gold-700 italic mt-0.5 ml-2">
                            {item.customization.milk && <span>• Choice: {item.customization.milk}</span>}
                            {item.customization.notes && <span>• Note: "{item.customization.notes}"</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Staff controller actions to switch order stage */}
                  <div className="md:col-span-4 flex flex-col gap-2 md:items-end justify-center h-full">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400">
                      Kitchen Controller
                    </span>

                    <div className="flex flex-wrap md:flex-col gap-1.5">
                      {order.status === "Received" && (
                        <button
                          onClick={() => onUpdateOrderStatus(order.id, "Preparing")}
                          className="px-4 py-2 bg-stone-900 hover:bg-orange-600 text-gold-300 hover:text-white rounded-xl text-xs font-display font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer"
                        >
                          🔥 Start Preparing
                        </button>
                      )}

                      {order.status === "Preparing" && (
                        <button
                          onClick={() => onUpdateOrderStatus(order.id, "Ready for Pickup / Serving")}
                          className="px-4 py-2 bg-stone-900 hover:bg-gold-500 text-gold-200 hover:text-stone-950 rounded-xl text-xs font-display font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer"
                        >
                          ☕ Ready to Serve
                        </button>
                      )}

                      {order.status === "Ready for Pickup / Serving" && (
                        <button
                          onClick={() => onUpdateOrderStatus(order.id, "Served & Completed")}
                          className="px-4 py-2 bg-stone-900 hover:bg-emerald-600 text-gold-300 hover:text-white rounded-xl text-xs font-display font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer"
                        >
                          ✓ Hand-delivered to Table
                        </button>
                      )}

                      {order.status === "Served & Completed" && (
                        <span className="text-[10px] font-mono text-stone-400 uppercase">
                          ✓ Completed & Closed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
