/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { MenuItem, CartItem, OrderStatus, Message } from "./types";
import { MENU_ITEMS } from "./data/menuData";
import MenuSection from "./components/MenuSection";
import CartDrawer from "./components/CartDrawer";
import OrderTracker from "./components/OrderTracker";
import ChatAssistant from "./components/ChatAssistant";
import { Coffee, MapPin, Sparkles, ChefHat, Layers, Award } from "lucide-react";

export default function App() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderPlaced, setOrderPlaced] = useState<boolean>(false);
  const [orderPaid, setOrderPaid] = useState<boolean>(false);
  const [orderStatus, setOrderStatus] = useState<OrderStatus>("Received");
  const [tableNumber, setTableNumber] = useState<string>("07");

  // Initial greeting chat message from the Toco Concierge
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "Welcome to **Toco Speciality**! ☕✨ I am your virtual AI host.\n\nHere against our elegant **grey marble counter** and premium wood shelving, we craft award-winning speciality coffees and gourmet signature plates.\n\nHow may I elevate your dining experience today? Feel free to ask me to **recommend a pairing**, **add items to your order**, **check status**, or **settle the bill**!",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  // Load state from localStorage on startup (retains orders/cart during refresh)
  useEffect(() => {
    const savedCart = localStorage.getItem("toco_cart");
    const savedOrderPlaced = localStorage.getItem("toco_orderPlaced");
    const savedOrderPaid = localStorage.getItem("toco_orderPaid");
    const savedOrderStatus = localStorage.getItem("toco_orderStatus");
    const savedTable = localStorage.getItem("toco_tableNumber");

    if (savedCart) setCart(JSON.parse(savedCart));
    if (savedOrderPlaced === "true") setOrderPlaced(true);
    if (savedOrderPaid === "true") setOrderPaid(true);
    if (savedOrderStatus) setOrderStatus(savedOrderStatus as OrderStatus);
    if (savedTable) setTableNumber(savedTable);
  }, []);

  // Save states to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("toco_cart", JSON.stringify(cart));
    localStorage.setItem("toco_orderPlaced", String(orderPlaced));
    localStorage.setItem("toco_orderPaid", String(orderPaid));
    localStorage.setItem("toco_orderStatus", orderStatus);
    localStorage.setItem("toco_tableNumber", tableNumber);
  }, [cart, orderPlaced, orderPaid, orderStatus, tableNumber]);

  // Cart Management Handlers
  const handleAddToCart = (item: MenuItem, customizationOption: string, qty: number) => {
    setCart((prevCart) => {
      const existingLine = prevCart.find(
        (c) => c.menuItemId === item.id && c.customization.milk === customizationOption
      );

      if (existingLine) {
        return prevCart.map((c) =>
          c.id === existingLine.id ? { ...c, quantity: c.quantity + qty } : c
        );
      }

      const newLine: CartItem = {
        id: `${item.id}-${Date.now()}`,
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        quantity: qty,
        customization: {
          milk: item.category === "Speciality Coffees" ? customizationOption : undefined,
          notes: item.category !== "Speciality Coffees" ? customizationOption : undefined,
        },
      };
      return [...prevCart, newLine];
    });
  };

  const handleUpdateQuantity = (id: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(id);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) => (item.id === id ? { ...item, quantity: newQty } : item))
    );
  };

  const handleRemoveItem = (id: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id));
  };

  const handlePlaceOrder = (tableNum: string) => {
    setTableNumber(tableNum);
    setOrderPlaced(true);
    setOrderStatus("Received");
    setOrderPaid(false);

    // Append alert messages in assistant logs
    const msg: Message = {
      id: `order-placed-${Date.now()}`,
      sender: "assistant",
      text: `🛎️ **Order Placed Successfully!**\n\nYour choices are sent directly to the baristas at **Table ${tableNum}**. The current status is **Received**. The kitchen staff is now preparing your delicious refreshments!`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, msg]);
  };

  const handleConfirmPayment = (method: string) => {
    setOrderPaid(true);
    
    // Append receipt notification
    const msg: Message = {
      id: `order-paid-${Date.now()}`,
      sender: "assistant",
      text: `💳 **Payment Confirmed!**\n\nThank you for settling your bill via **${method}**. We hope you enjoyed your signature coffees and cuisine at **Toco Speciality**. Have a fantastic day!`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, msg]);
  };

  const handleAdvanceStatus = () => {
    setOrderStatus((curr) => {
      let next: OrderStatus = "Received";
      let statusText = "";

      if (curr === "Received") {
        next = "Preparing";
        statusText = "🔥 Our baristas and chefs are busy steaming organic milk, brewing premium espresso, and assembling your dishes! Your order is now **Preparing**.";
      } else if (curr === "Preparing") {
        next = "Ready for Pickup / Serving";
        statusText = "☕ Plate & Cup are ready! A Toco Speciality host is bringing your orders to **Table " + tableNumber + "** right now!";
      } else {
        next = "Ready for Pickup / Serving";
        return curr; // already completed
      }

      // Append state update inside concierge logs
      const msg: Message = {
        id: `status-update-${Date.now()}`,
        sender: "assistant",
        text: statusText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, msg]);

      return next;
    });
  };

  // Helper fuzzy matching menu item by string name
  const findMenuItem = (name: string): MenuItem | undefined => {
    if (!name) return undefined;
    const lower = name.toLowerCase().trim();
    return MENU_ITEMS.find(
      (item) =>
        lower.includes(item.name.toLowerCase()) ||
        item.name.toLowerCase().includes(lower) ||
        item.id.toLowerCase() === lower
    );
  };

  // Execute State Changes Triggered by server-side Gemini AI
  const handleExecuteAIAction = (action: any) => {
    if (!action || !action.type) return;

    switch (action.type) {
      case "add": {
        const item = findMenuItem(action.itemName);
        if (item) {
          handleAddToCart(item, action.customization || "Standard", action.quantity || 1);
        }
        break;
      }
      case "remove": {
        const item = findMenuItem(action.itemName);
        if (item) {
          setCart((prev) => prev.filter((c) => c.menuItemId !== item.id));
        }
        break;
      }
      case "clear": {
        setCart([]);
        setOrderPlaced(false);
        setOrderPaid(false);
        break;
      }
      case "place_order": {
        if (cart.length > 0) {
          handlePlaceOrder(tableNumber);
        }
        break;
      }
      case "pay": {
        if (orderPlaced && !orderPaid) {
          handleConfirmPayment("Digital AI Wallet");
        }
        break;
      }
      case "update_status": {
        if (action.newStatus) {
          setOrderStatus(action.newStatus);
        }
        break;
      }
      default:
        break;
    }
  };

  const resetAllSession = () => {
    setCart([]);
    setOrderPlaced(false);
    setOrderPaid(false);
    setOrderStatus("Received");
    localStorage.clear();
  };

  return (
    <div className="min-h-screen bg-[#f9f8f6] text-stone-900 pb-20 selection:bg-gold-200">
      {/* Luxury Top Header Nav */}
      <header className="border-b border-stone-150/60 bg-white/70 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-serif font-black tracking-widest text-stone-900 uppercase">
              Toco <span className="text-gold-600 italic">Speciality</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono bg-stone-100 text-stone-500 px-3 py-1.5 rounded-full border border-stone-200">
              Lounge Mode
            </span>
            <button
              onClick={resetAllSession}
              className="text-xs font-display text-stone-400 hover:text-red-600 transition-colors cursor-pointer"
            >
              Reset Session
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-8">
        {/* Brand & Ambiance Showcase Bento Board */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          {/* Tile 1: Elegant Branding Wall Image (Images.jpg) */}
          <div className="lg:col-span-2 relative h-72 rounded-3xl overflow-hidden shadow-lg border border-stone-150 flex items-center justify-end bg-stone-200">
            {/* Displaying images.jpg with no-referrer as required */}
            <img
              src="images.jpg"
              alt="Toco Speciality Marble Wall branding logo"
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover select-none"
              onError={(e) => {
                // Beautiful fallback in case the image file is not on the server
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            {/* Elegant overlay card recreating the logo feel */}
            <div className="absolute inset-0 bg-gradient-to-r from-stone-950/80 via-stone-950/40 to-stone-900/10 flex flex-col justify-end p-8 text-white">
              <span className="text-[10px] font-mono tracking-widest text-gold-400 uppercase font-bold mb-2 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-gold-400" />
                Speciality Coffee Lounge & Roastery
              </span>
              <h1 className="text-4xl md:text-5xl font-serif font-semibold text-stone-100 tracking-wide mb-3">
                Toco Speciality
              </h1>
              <p className="text-sm text-stone-300 font-light max-w-lg leading-relaxed">
                Welcome to our luxury table lounge. Our physical space is defined by polished, custom grey marble walls, custom cherry-wood shelving, and a quiet, ambient atmosphere of roasting beans.
              </p>
            </div>
          </div>

          {/* Tile 2: Table Status Overview */}
          <div className="bg-gradient-to-br from-stone-900 to-stone-950 text-white rounded-3xl p-6 shadow-lg border border-stone-850 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-mono tracking-widest text-gold-400 uppercase font-bold">
                  Table Session
                </span>
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
              </div>
              <h2 className="text-3xl font-serif font-semibold text-gold-200">
                Table {tableNumber}
              </h2>
              <div className="text-stone-400 text-xs mt-3 leading-relaxed font-light">
                Scan the QR code to connect. Use our interactive menu cards or let the AI concierge manage your culinary preferences.
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-stone-800 flex items-center justify-between text-xs font-mono text-stone-400">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-gold-500" />
                Lounge Section B
              </span>
              <span>EST. 2026</span>
            </div>
          </div>
        </div>

        {/* Core Double-Panel Work area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left panel: Interactive Gourmet Menu (7 cols on Desktop) */}
          <div className="lg:col-span-7 space-y-8">
            <div className="flex items-baseline justify-between mb-2">
              <div>
                <span className="text-xs font-mono text-gold-600 font-bold uppercase tracking-widest">
                  Our Delicacies
                </span>
                <h2 className="text-3xl font-serif font-semibold text-stone-900 mt-1">
                  The Lounge Menu
                </h2>
              </div>
              <span className="text-xs text-stone-400 font-display">
                Scroll to explore sections
              </span>
            </div>

            <MenuSection onAddToCart={handleAddToCart} />
          </div>

          {/* Right panel: Cart, Live Order Tracking, AI Chat (5 cols on Desktop) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Section A: Live Order Tracker (Displayed if order is active) */}
            {orderPlaced && (
              <OrderTracker
                status={orderStatus}
                items={cart}
                tableNumber={tableNumber}
                onAdvanceStatus={handleAdvanceStatus}
              />
            )}

            {/* Section B: Toco AI Concierge Chat Workspace */}
            <ChatAssistant
              messages={messages}
              onAddMessage={(msg) => setMessages((prev) => [...prev, msg])}
              cart={cart}
              orderStatus={orderStatus}
              orderPlaced={orderPlaced}
              orderPaid={orderPaid}
              onExecuteAIAction={handleExecuteAIAction}
            />

            {/* Section C: Visual Cart and Receipt Breakdown */}
            <CartDrawer
              cart={cart}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              onPlaceOrder={handlePlaceOrder}
              orderPlaced={orderPlaced}
              orderPaid={orderPaid}
              onConfirmPayment={handleConfirmPayment}
              tableNumber={tableNumber}
              setTableNumber={setTableNumber}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
