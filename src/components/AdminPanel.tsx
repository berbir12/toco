/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { MenuItem, TableConfig, Order } from "../types";
import { Plus, Trash2, Landmark, Coffee, Layers, Users, TrendingUp, RefreshCw, Eye, Sparkles, Check, Download } from "lucide-react";

interface TableQRCodeProps {
  tableNumber: string;
}

export function TableQRCode({ tableNumber }: TableQRCodeProps) {
  const [qrSrc, setQrSrc] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  // The landing URL for scanning is configured to use the custom production domain
  // so that even when administrators manage tables from the developer portal,
  // the generated and printed physical QR codes correctly route customers to the production site.
  const scanUrl = `https://tocospecialty.bitlabsbuild.com/?table=${tableNumber}`;

  useEffect(() => {
    let active = true;
    setLoading(true);
    QRCode.toDataURL(
      scanUrl,
      {
        width: 300,
        margin: 2,
        color: {
          dark: "#1c1816", // Deep charcoal/black
          light: "#ffffff", // Pure white for perfect scanning contrast
        },
      },
      (err, url) => {
        if (active) {
          setLoading(false);
          if (err) {
            console.error(err);
          } else {
            setQrSrc(url);
          }
        }
      }
    );
    return () => {
      active = false;
    };
  }, [tableNumber, scanUrl]);

  const handleDownload = () => {
    if (!qrSrc) return;
    const link = document.createElement("a");
    link.href = qrSrc;
    link.download = `toco_table_${tableNumber}_qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="border border-stone-200 rounded-xl p-3.5 bg-white flex flex-col items-center justify-center space-y-2.5">
      {loading ? (
        <div className="w-20 h-20 flex items-center justify-center">
          <RefreshCw className="w-4 h-4 text-gold-500 animate-spin" />
        </div>
      ) : (
        <img
          src={qrSrc}
          alt={`Table ${tableNumber} QR`}
          className="w-20 h-20 border border-stone-150 rounded shadow-xs select-none"
        />
      )}
      <div className="text-center w-full">
        <p className="text-[10px] font-mono tracking-wider text-stone-600 font-bold">Table {tableNumber}</p>
        <span className="text-[8px] text-stone-400 block truncate max-w-full" title={scanUrl}>{scanUrl}</span>
      </div>
      <button
        type="button"
        onClick={handleDownload}
        className="w-full bg-stone-900 hover:bg-stone-850 text-gold-200 hover:text-white py-1 rounded-lg text-[9px] font-sans font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-stone-900 shadow-3xs"
      >
        <Download className="w-3 h-3 text-gold-400" />
        Download QR
      </button>
    </div>
  );
}

interface AdminPanelProps {
  menuItems: MenuItem[];
  tables: TableConfig[];
  orders: Order[];
  onAddMenuItem: (item: MenuItem) => void;
  onDeleteMenuItem: (id: string) => void;
  onAddTable: (table: TableConfig) => void;
  onDeleteTable: (id: string) => void;
  onResetDatabase: () => void;
  onSimulateTableScan: (tableNumber: string) => void;
  usersList: any[];
  onUpdateUserRole: (uid: string, newRole: string) => void;
}

export default function AdminPanel({
  menuItems,
  tables,
  orders,
  onAddMenuItem,
  onDeleteMenuItem,
  onAddTable,
  onDeleteTable,
  onResetDatabase,
  onSimulateTableScan,
  usersList,
  onUpdateUserRole,
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<"menu" | "tables" | "analytics" | "users">("menu");

  // Add Item State
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemCategory, setItemCategory] = useState<"Speciality Coffees" | "Signature Dishes" | "Desserts">("Speciality Coffees");
  const [itemDescription, setItemDescription] = useState("");
  const [itemOptions, setItemOptions] = useState("");
  const [addSuccessMsg, setAddSuccessMsg] = useState("");

  // Add Table State
  const [tableNum, setTableNum] = useState("");
  const [tableSeats, setTableSeats] = useState("4");

  const handleDownloadAllQRs = async () => {
    for (let i = 0; i < tables.length; i++) {
      const t = tables[i];
      const scanUrl = `https://tocospecialty.bitlabsbuild.com/?table=${t.tableNumber}`;
      try {
        const url = await QRCode.toDataURL(scanUrl, {
          width: 600,
          margin: 2,
          color: {
            dark: "#1c1816",
            light: "#ffffff",
          },
        });
        const link = document.createElement("a");
        link.href = url;
        link.download = `toco_table_${t.tableNumber}_qr.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (err) {
        console.error("Batch download error:", err);
      }
    }
  };

  // Financial Calculations
  const completedOrders = orders.filter(o => o.status === "Served & Completed" || o.paymentConfirmed);
  const totalSales = completedOrders.reduce((sum, o) => sum + o.subtotal, 0);
  const totalVAT = completedOrders.reduce((sum, o) => sum + o.vat, 0);
  const totalTips = completedOrders.reduce((sum, o) => sum + o.serviceCharge, 0);
  const grossRevenue = totalSales + totalVAT + totalTips;

  // Calculate Popular Items
  const itemCounts: { [key: string]: { name: string; qty: number; revenue: number } } = {};
  completedOrders.forEach(o => {
    o.items.forEach(item => {
      if (!itemCounts[item.menuItemId]) {
        itemCounts[item.menuItemId] = { name: item.name, qty: 0, revenue: 0 };
      }
      itemCounts[item.menuItemId].qty += item.quantity;
      itemCounts[item.menuItemId].revenue += item.price * item.quantity;
    });
  });

  const popularItems = Object.values(itemCounts).sort((a, b) => b.qty - a.qty).slice(0, 5);

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName || !itemPrice) return;

    const parsedOptions = itemOptions
      ? itemOptions.split(",").map(o => o.trim()).filter(o => o.length > 0)
      : [];

    const newItem: MenuItem = {
      id: `${itemCategory.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      name: itemName,
      price: parseFloat(itemPrice),
      category: itemCategory,
      description: itemDescription || "Crafted beautifully by Toco Speciality.",
      optionsLabel: itemCategory === "Speciality Coffees" ? "Milk Option" : "Customization",
      options: parsedOptions,
    };

    onAddMenuItem(newItem);
    setAddSuccessMsg(`Successfully added "${itemName}" to menu!`);
    
    // Clear
    setItemName("");
    setItemPrice("");
    setItemDescription("");
    setItemOptions("");

    setTimeout(() => setAddSuccessMsg(""), 3000);
  };

  const handleCreateTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNum) return;

    const newTable: TableConfig = {
      id: `table-${Date.now()}`,
      tableNumber: tableNum,
      seatsCount: parseInt(tableSeats) || 4,
      status: "Available"
    };

    onAddTable(newTable);
    setTableNum("");
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300" id="admin-panel">
      {/* Tab Switchers */}
      <div className="flex border-b border-stone-200">
        <button
          onClick={() => setActiveTab("menu")}
          className={`px-5 py-3.5 font-display text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === "menu"
              ? "border-stone-900 text-stone-900"
              : "border-transparent text-stone-400 hover:text-stone-700"
          }`}
        >
          Menu Management
        </button>
        <button
          onClick={() => setActiveTab("tables")}
          className={`px-5 py-3.5 font-display text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === "tables"
              ? "border-stone-900 text-stone-900"
              : "border-transparent text-stone-400 hover:text-stone-700"
          }`}
        >
          QR & Table Config
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={`px-5 py-3.5 font-display text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === "analytics"
              ? "border-stone-900 text-stone-900"
              : "border-transparent text-stone-400 hover:text-stone-700"
          }`}
        >
          Finance & Analytics
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`px-5 py-3.5 font-display text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === "users"
              ? "border-stone-900 text-stone-900"
              : "border-transparent text-stone-400 hover:text-stone-700"
          }`}
        >
          User Accounts
        </button>
      </div>

      {/* SUCCESS TOAST */}
      {addSuccessMsg && (
        <div className="bg-stone-900 text-gold-300 border border-gold-500/20 px-4 py-3 rounded-xl flex items-center gap-2 text-xs">
          <Check className="w-4 h-4 text-gold-400" />
          <span>{addSuccessMsg}</span>
        </div>
      )}

      {/* VIEW A: MENU MANAGEMENT */}
      {activeTab === "menu" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Side: Create Form */}
          <div className="lg:col-span-5 bg-white border border-stone-150 rounded-3xl p-6 shadow-sm">
            <h3 className="text-base font-serif font-bold text-stone-900 mb-4 pb-2 border-b border-stone-100 uppercase tracking-wider">
              Create New Delicacy
            </h3>

            <form onSubmit={handleCreateItem} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono font-bold tracking-widest text-stone-400 uppercase mb-1.5">
                  Name of Dish / Coffee
                </label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. Saffron Rose Affogato"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-gold-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono font-bold tracking-widest text-stone-400 uppercase mb-1.5">
                    Price (ETB)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    placeholder="250"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-gold-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold tracking-widest text-stone-400 uppercase mb-1.5">
                    Section
                  </label>
                  <select
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value as any)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-gold-500 font-display font-semibold"
                  >
                    <option value="Speciality Coffees">Coffees</option>
                    <option value="Signature Dishes">Signature Dishes</option>
                    <option value="Desserts">Desserts</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold tracking-widest text-stone-400 uppercase mb-1.5">
                  Ingredients Description
                </label>
                <textarea
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  placeholder="Provide ingredients, allergen information, or styling tips..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-gold-500 h-20 resize-none font-light"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold tracking-widest text-stone-400 uppercase mb-1.5">
                  Options (Comma separated)
                </label>
                <input
                  type="text"
                  value={itemOptions}
                  onChange={(e) => setItemOptions(e.target.value)}
                  placeholder="Whole Milk, Oat Milk (+15 ETB), Soy Milk"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-gold-500"
                />
                <span className="text-[10px] text-stone-400 font-display block mt-1 leading-normal">
                  Separate custom milk alternatives, sizes, or egg prep styles using commas.
                </span>
              </div>

              <button
                type="submit"
                className="w-full bg-stone-900 text-gold-300 hover:bg-stone-850 py-3 rounded-xl font-display font-bold text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer"
              >
                Add Menu Item
              </button>
            </form>
          </div>

          {/* Right Side: List and Delete */}
          <div className="lg:col-span-7 bg-white border border-stone-150 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <h3 className="text-base font-serif font-bold text-stone-900 uppercase tracking-wider">
                Live Menu Catalog
              </h3>
              <span className="text-xs font-mono bg-stone-100 text-stone-500 px-3 py-1 rounded-md">
                {menuItems.length} Dishes
              </span>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {menuItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border border-stone-100 hover:bg-stone-50 rounded-2xl transition-all">
                  <div className="space-y-0.5">
                    <div className="flex items-baseline gap-2">
                      <span className="font-display font-bold text-xs text-stone-900">{item.name}</span>
                      <span className="text-[10px] font-mono bg-gold-50 text-gold-700 px-1.5 rounded uppercase font-bold">{item.category}</span>
                    </div>
                    <p className="text-[11px] text-stone-400 max-w-sm font-light line-clamp-1">{item.description}</p>
                    <span className="text-xs font-mono font-bold text-stone-850 block">{Number(item.price).toFixed(2)} ETB</span>
                  </div>

                  <button
                    onClick={() => onDeleteMenuItem(item.id)}
                    className="p-2.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW B: QR & TABLES CONFIGURATION */}
      {activeTab === "tables" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Add Table Column */}
          <div className="lg:col-span-4 bg-white border border-stone-150 rounded-3xl p-6 shadow-sm h-fit">
            <h3 className="text-base font-serif font-bold text-stone-900 mb-4 pb-2 border-b border-stone-100 uppercase tracking-wider">
              Create QR Table Location
            </h3>

            <form onSubmit={handleCreateTable} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono font-bold tracking-widest text-stone-400 uppercase mb-1.5">
                  Table Number Label
                </label>
                <input
                  type="text"
                  required
                  value={tableNum}
                  onChange={(e) => setTableNum(e.target.value)}
                  placeholder="e.g. 12"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-gold-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold tracking-widest text-stone-400 uppercase mb-1.5">
                  Seats count
                </label>
                <input
                  type="number"
                  value={tableSeats}
                  onChange={(e) => setTableSeats(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-gold-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-stone-900 text-gold-300 hover:bg-stone-850 py-3 rounded-xl font-display font-bold text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer"
              >
                Register Table QR
              </button>
            </form>
          </div>

          {/* QR List and Live Sim Scanner Column */}
          <div className="lg:col-span-8 bg-white border border-stone-150 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="border-b border-stone-100 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-base font-serif font-bold text-stone-900 uppercase tracking-wider">
                  Active QR codes
                </h3>
                <p className="text-xs text-stone-400 font-light mt-0.5">
                  Every table gets an official QR launcher. Simulate scanning to instantly set the dining session for your active preview!
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadAllQRs}
                className="bg-gold-500 hover:bg-stone-900 text-stone-950 hover:text-gold-300 px-4 py-2.5 rounded-xl text-[10px] font-sans font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-gold-500 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Download All QRs
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-4 max-h-[550px] overflow-y-auto pr-1">
              {tables.map((t) => (
                <div key={t.id} className="border border-stone-150 rounded-2xl p-4 flex flex-col justify-between bg-stone-50">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-display font-bold text-sm text-stone-900">Table {t.tableNumber}</span>
                      <span className="text-[10px] font-mono bg-stone-200 text-stone-600 px-2 py-0.5 rounded-sm">
                        {t.seatsCount} Seats
                      </span>
                    </div>

                    {/* Real high-res QR code card */}
                    <TableQRCode tableNumber={t.tableNumber} />
                  </div>

                  {/* Simulations & deletes */}
                  <div className="flex gap-2 mt-4 pt-3 border-t border-stone-150">
                    <button
                      onClick={() => onSimulateTableScan(t.tableNumber)}
                      className="flex-1 bg-stone-900 hover:bg-gold-500 text-gold-300 hover:text-stone-900 py-1.5 rounded-lg text-[10px] font-display font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Scan Sim
                    </button>
                    <button
                      onClick={() => onDeleteTable(t.id)}
                      disabled={tables.length <= 1}
                      className="p-1.5 border border-stone-200 hover:border-red-200 text-stone-400 hover:text-red-500 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW C: FINANCE & ANALYTICS */}
      {activeTab === "analytics" && (
        <div className="space-y-8">
          {/* Key Metric Financial Overviews */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-stone-150 rounded-2xl p-5 shadow-xs">
              <span className="text-[10px] font-mono tracking-widest text-stone-400 uppercase font-bold">
                Food & Beverage Sales
              </span>
              <p className="text-2xl font-serif font-black text-stone-900 mt-1">{totalSales.toFixed(2)} ETB</p>
              <span className="text-[10px] text-stone-400 block mt-1">Excl. tax & charges</span>
            </div>

            <div className="bg-white border border-stone-150 rounded-2xl p-5 shadow-xs">
              <span className="text-[10px] font-mono tracking-widest text-stone-400 uppercase font-bold">
                VAT Collected (10%)
              </span>
              <p className="text-2xl font-serif font-black text-stone-900 mt-1">{totalVAT.toFixed(2)} ETB</p>
              <span className="text-[10px] text-stone-400 block mt-1">Ready for filing</span>
            </div>

            <div className="bg-white border border-stone-150 rounded-2xl p-5 shadow-xs">
              <span className="text-[10px] font-mono tracking-widest text-stone-400 uppercase font-bold">
                Tips & Service Charges (5%)
              </span>
              <p className="text-2xl font-serif font-black text-gold-600 mt-1">{totalTips.toFixed(2)} ETB</p>
              <span className="text-[10px] text-stone-400 block mt-1">Distributable to staff</span>
            </div>

            <div className="bg-stone-900 border border-stone-850 rounded-2xl p-5 shadow-xs text-white">
              <span className="text-[10px] font-mono tracking-widest text-gold-400 uppercase font-bold">
                Gross Register Income
              </span>
              <p className="text-2xl font-serif font-black text-gold-300 mt-1">{grossRevenue.toFixed(2)} ETB</p>
              <span className="text-[10px] text-stone-400 block mt-1">Total credit card & wallet</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Col: Popular items list */}
            <div className="lg:col-span-6 bg-white border border-stone-150 rounded-3xl p-6 shadow-sm">
              <h3 className="text-base font-serif font-bold text-stone-900 mb-4 pb-2 border-b border-stone-100 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-gold-500 animate-pulse" />
                Popular Delicacies Purchased
              </h3>

              {popularItems.length === 0 ? (
                <div className="text-center py-12 text-stone-400 text-xs font-light">
                  Complete orders at the staff kitchen panel to view item frequency metrics.
                </div>
              ) : (
                <div className="space-y-4">
                  {popularItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-stone-400 w-5">#{idx + 1}</span>
                        <span className="font-display font-semibold text-stone-800">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-stone-900 block">{item.qty} Sold</span>
                        <span className="text-[10px] text-stone-400 font-mono">{item.revenue.toFixed(2)} ETB</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Col: Dangerous Action Reset */}
            <div className="lg:col-span-6 bg-white border border-stone-150 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-base font-serif font-bold text-stone-900 mb-3 pb-2 border-b border-stone-100 uppercase tracking-wider">
                  Operational Settings
                </h3>
                <p className="text-xs text-stone-500 leading-relaxed font-light mb-6">
                  Reset the simulated database to clear order counters, clean previous test orders, and restore standard boutique settings.
                </p>
              </div>

              <button
                onClick={onResetDatabase}
                className="w-full bg-red-50 hover:bg-red-100 border border-red-250 text-red-700 py-3 rounded-xl font-display font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reset Operations Database
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW D: USER ACCOUNTS PRIVILEGES */}
      {activeTab === "users" && (
        <div className="bg-white border border-stone-150 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100">
            <div>
              <h3 className="text-base font-serif font-bold text-stone-900 uppercase tracking-wider">
                User Privilege Roles
              </h3>
              <p className="text-xs text-stone-400 font-light mt-0.5">
                Manage registered user credentials, view logs, and elevate/revoke staff and admin privileges in the PostgreSQL database.
              </p>
            </div>
            <span className="text-xs font-mono bg-stone-100 text-stone-500 px-3 py-1 rounded-md">
              {usersList?.length || 0} Accounts
            </span>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {(!usersList || usersList.length === 0) ? (
              <div className="text-center py-12 text-stone-400 text-xs font-light">
                No registered user profiles found in the database.
              </div>
            ) : (
              usersList.map((usr) => (
                <div key={usr.uid} className="flex items-center justify-between p-4 border border-stone-100 hover:bg-stone-50 rounded-2xl transition-all">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-display font-bold text-xs text-stone-900">{usr.email}</span>
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                        usr.role === "admin" 
                          ? "bg-red-50 text-red-700 border border-red-200" 
                          : usr.role === "staff"
                          ? "bg-amber-50 text-amber-700 border border-amber-250"
                          : "bg-stone-100 text-stone-600 border border-stone-200"
                      }`}>
                        {usr.role}
                      </span>
                    </div>
                    <p className="text-[10px] text-stone-400 font-mono">UID: {usr.uid}</p>
                  </div>

                  {/* Role Swapper Select */}
                  <div className="flex items-center gap-3">
                    <select
                      value={usr.role}
                      onChange={(e) => onUpdateUserRole(usr.uid, e.target.value)}
                      className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none font-display font-semibold"
                    >
                      <option value="customer">Customer</option>
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
