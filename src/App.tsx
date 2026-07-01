/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { MenuItem, CartItem, Order, OrderStatus, Message, TableConfig } from "./types";
import { MENU_ITEMS } from "./data/menuData";
import MenuSection from "./components/MenuSection";
import CartDrawer from "./components/CartDrawer";
import OrderTracker from "./components/OrderTracker";
import ChatAssistant from "./components/ChatAssistant";
import StaffDashboard from "./components/StaffDashboard";
import AdminPanel from "./components/AdminPanel";
import { motion, AnimatePresence } from "motion/react";
import { 
  Coffee, MapPin, Award, Eye, Settings, Users, ChefHat, 
  Lock, ArrowLeft, Unlock, AlertCircle, Sparkles, LogOut, CheckCircle
} from "lucide-react";

// Firebase Auth Client
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth, googleAuthProvider } from "./lib/firebase.ts";

const INITIAL_TABLES: TableConfig[] = [
  { id: "t1", tableNumber: "01", seatsCount: 2, status: "Available" },
  { id: "t2", tableNumber: "03", seatsCount: 4, status: "Available" },
  { id: "t3", tableNumber: "07", seatsCount: 4, status: "Available" },
  { id: "t4", tableNumber: "10", seatsCount: 6, status: "Available" },
  { id: "t5", tableNumber: "14", seatsCount: 2, status: "Available" },
];

export default function App() {
  // Hash Routing State
  const [currentView, setCurrentView] = useState<"customer" | "staff" | "admin">("customer");

  // Firebase Auth & Database User State
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<{ uid: string; email: string; role: string; dbId: number } | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [usersList, setUsersList] = useState<any[]>([]);

  // Authorization States
  const [staffAuthorized, setStaffAuthorized] = useState<boolean>(false);
  const [adminAuthorized, setAdminAuthorized] = useState<boolean>(false);

  // Passcode Interactive Entry State (kept for legacy fallback/UX if needed)
  const [pinInput, setPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  // Dynamic States
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<TableConfig[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
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

  // URL Hash Listener & Router Sync
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === "#/staff") {
        setCurrentView("staff");
      } else if (hash === "#/admin") {
        setCurrentView("admin");
      } else {
        setCurrentView("customer");
      }
      // Reset any temporary pin input when route changes
      setPinInput("");
      setPinError(null);
    };

    window.addEventListener("hashchange", handleHashChange);
    handleHashChange(); // Run initially

    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Firebase Auth Observer & Sync Profile
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoadingAuth(true);
      if (user) {
        setFirebaseUser(user);
        try {
          const token = await user.getIdToken(true);
          setAuthToken(token);

          const res = await fetch("/api/me", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (res.ok) {
            const profile = await res.json();
            setUserProfile(profile);

            // Set role authorizations
            if (profile.role === "admin") {
              setAdminAuthorized(true);
              setStaffAuthorized(true);
            } else if (profile.role === "staff") {
              setStaffAuthorized(true);
              setAdminAuthorized(false);
            } else {
              setStaffAuthorized(false);
              setAdminAuthorized(false);
            }
          }
        } catch (err) {
          console.error("Authentication check failed:", err);
        }
      } else {
        setFirebaseUser(null);
        setUserProfile(null);
        setAuthToken(null);
        setStaffAuthorized(false);
        setAdminAuthorized(false);
      }
      setIsLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch Database Orders
  const fetchOrdersFromDB = async () => {
    if (!authToken) return;
    try {
      const res = await fetch("/api/orders", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (res.ok) {
        const dbOrders = await res.json();
        setOrders(dbOrders);

        // Sync active unpaid order
        const activeUnpaid = dbOrders.find((o: any) => !o.paymentConfirmed);
        if (activeUnpaid) {
          setActiveOrderId(activeUnpaid.id);
        }
      }
    } catch (err) {
      console.error("Failed to load database orders:", err);
    }
  };

  useEffect(() => {
    fetchOrdersFromDB();
    
    // Poll every 5s if logged in and has access to kitchen / admin panel
    let interval: any;
    if (authToken && (userProfile?.role === "staff" || userProfile?.role === "admin")) {
      interval = setInterval(fetchOrdersFromDB, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [authToken, userProfile?.role]);

  // Fetch registered users (Admins only)
  const fetchUsersFromDB = async () => {
    if (!authToken || userProfile?.role !== "admin") return;
    try {
      const res = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (res.ok) {
        const usersData = await res.json();
        setUsersList(usersData);
      }
    } catch (err) {
      console.error("Failed to load database users:", err);
    }
  };

  useEffect(() => {
    if (userProfile?.role === "admin") {
      fetchUsersFromDB();
    }
  }, [authToken, userProfile?.role, currentView]);

  // Promote / demote user role
  const handleUpdateUserRole = async (uid: string, newRole: string) => {
    if (!authToken) return;
    try {
      const res = await fetch(`/api/admin/users/${uid}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setUsersList((prev) => prev.map((u) => (u.uid === uid ? updatedUser : u)));
        
        // If updating own role, trigger a reload of status
        if (firebaseUser && firebaseUser.uid === uid) {
          const token = await firebaseUser.getIdToken(true);
          setAuthToken(token);
          window.location.reload();
        }
      } else {
        const err = await res.json();
        alert(`Failed to update user role: ${err.error}`);
      }
    } catch (err) {
      console.error("Role update error:", err);
    }
  };

  const navigateTo = (view: "customer" | "staff" | "admin") => {
    if (view === "customer") window.location.hash = "#/";
    else if (view === "staff") window.location.hash = "#/staff";
    else if (view === "admin") window.location.hash = "#/admin";
    setCurrentView(view);
  };

  // Load state from localStorage on startup
  useEffect(() => {
    const savedMenu = localStorage.getItem("toco_menuItems");
    const savedTables = localStorage.getItem("toco_tables");
    const savedCart = localStorage.getItem("toco_cart");
    const savedActiveOrderId = localStorage.getItem("toco_activeOrderId");
    const savedTableNumber = localStorage.getItem("toco_tableNumber");
    const savedMessages = localStorage.getItem("toco_messages");

    if (savedMenu) setMenuItems(JSON.parse(savedMenu));
    else setMenuItems(MENU_ITEMS);

    if (savedTables) setTables(JSON.parse(savedTables));
    else setTables(INITIAL_TABLES);

    if (savedCart) setCart(JSON.parse(savedCart));
    else setCart([]);

    if (savedActiveOrderId) setActiveOrderId(savedActiveOrderId);
    else setActiveOrderId(null);

    if (savedTableNumber) setTableNumber(savedTableNumber);
    else setTableNumber("07");

    if (savedMessages) setMessages(JSON.parse(savedMessages));
  }, []);

  // Sync to localStorage
  useEffect(() => {
    if (menuItems.length > 0) localStorage.setItem("toco_menuItems", JSON.stringify(menuItems));
  }, [menuItems]);

  useEffect(() => {
    if (tables.length > 0) localStorage.setItem("toco_tables", JSON.stringify(tables));
  }, [tables]);

  useEffect(() => {
    localStorage.setItem("toco_cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (activeOrderId) localStorage.setItem("toco_activeOrderId", activeOrderId);
    else localStorage.removeItem("toco_activeOrderId");
  }, [activeOrderId]);

  useEffect(() => {
    localStorage.setItem("toco_tableNumber", tableNumber);
  }, [tableNumber]);

  useEffect(() => {
    if (messages.length > 0) localStorage.setItem("toco_messages", JSON.stringify(messages));
  }, [messages]);

  // Auth local storage sync helpers
  const handleLockSession = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Sign out error:", err);
    }
    setPinInput("");
    setPinError(null);
    navigateTo("customer");
  };

  const handleAuthorizeSuccess = (role: "staff" | "admin") => {
    if (role === "staff") {
      setStaffAuthorized(true);
    } else {
      setAdminAuthorized(true);
    }
    setPinInput("");
    setPinError(null);
  };

  // Interactive PIN pad click
  const handlePinKeyPress = (val: string) => {
    setPinError(null);
    if (pinInput.length >= 4) return;
    const nextPin = pinInput + val;
    setPinInput(nextPin);

    // Auto trigger submission when reaching 4 digits
    if (nextPin.length === 4) {
      setIsAuthenticating(true);
      setTimeout(() => {
        setIsAuthenticating(false);
        if (currentView === "staff") {
          if (nextPin === "5678") {
            handleAuthorizeSuccess("staff");
          } else {
            setPinError("Invalid Security Passcode");
            setPinInput("");
          }
        } else if (currentView === "admin") {
          if (nextPin === "1234") {
            handleAuthorizeSuccess("admin");
          } else {
            setPinError("Invalid Administration Key");
            setPinInput("");
          }
        }
      }, 700);
    }
  };

  const handlePinDelete = () => {
    setPinInput(prev => prev.slice(0, -1));
    setPinError(null);
  };

  const handlePinClear = () => {
    setPinInput("");
    setPinError(null);
  };

  // Helpers
  const getActiveOrder = (): Order | null => {
    if (!activeOrderId) return null;
    return orders.find(o => o.id === activeOrderId) || null;
  };

  // Cart Handlers
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

  // Order Placement Workflow
  const handlePlaceOrder = async (tableNum: string) => {
    if (cart.length === 0) return;
    if (!authToken) {
      alert("Please Sign In with Google before placing an order to secure your dining session.");
      return;
    }

    setTableNumber(tableNum);
    
    const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const vat = subtotal * 0.10;
    const serviceCharge = subtotal * 0.05;
    const total = subtotal + vat + serviceCharge;

    const orderPayload = {
      id: `order-${Date.now()}`,
      items: cart.map(item => ({
        menuItemId: item.menuItemId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        customization: item.customization,
      })),
      subtotal,
      vat,
      serviceCharge,
      total,
      tableNumber: tableNum,
    };

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(orderPayload),
      });

      if (res.ok) {
        const createdOrder = await res.json();
        setOrders((prev) => [createdOrder, ...prev]);
        setActiveOrderId(createdOrder.id);
        setCart([]); // Reset cart

        // Add message to chat assistant log
        const msg: Message = {
          id: `order-placed-${Date.now()}`,
          sender: "assistant",
          text: `🛎️ **Order Placed Successfully!**\n\nYour choices are sent directly to the baristas at **Table ${tableNum}**. The current status is **Received**. The kitchen staff is now preparing your delicious refreshments!`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, msg]);
      } else {
        const err = await res.json();
        alert(`Failed to submit order: ${err.error}`);
      }
    } catch (err) {
      console.error("Submit order error:", err);
    }
  };

  const handleConfirmPayment = async (method: string) => {
    const activeOrder = getActiveOrder();
    if (!activeOrder || !authToken) return;

    try {
      const res = await fetch(`/api/orders/${activeOrder.id}/payment`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ paymentMethod: method }),
      });

      if (res.ok) {
        const updatedOrder = await res.json();
        setOrders((prev) =>
          prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
        );

        // Append receipt notification
        const msg: Message = {
          id: `order-paid-${Date.now()}`,
          sender: "assistant",
          text: `💳 **Payment Confirmed!**\n\nThank you for settling your bill via **${method}**. We hope you enjoyed your signature coffees and cuisine at **Toco Speciality**. Have a fantastic day!`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, msg]);
      }
    } catch (err) {
      console.error("Payment error:", err);
    }
  };

  // Staff order status update
  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    if (!authToken) return;

    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          status: newStatus,
          statusNote: `Updated by staff to ${newStatus}`,
        }),
      });

      if (res.ok) {
        const updatedOrder = await res.json();
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? updatedOrder : o))
        );

        // If this is the current active customer session's order, notify in chat assistant logs!
        if (activeOrderId === orderId) {
          let statusText = "";
          if (newStatus === "Preparing") {
            statusText = "🔥 Our baristas and chefs are busy steaming organic milk, brewing premium espresso, and assembling your dishes! Your order is now **Preparing**.";
          } else if (newStatus === "Ready for Pickup / Serving") {
            statusText = `☕ Plate & Cup are ready! A Toco Speciality host is bringing your orders to **Table ${tableNumber}** right now!`;
          } else if (newStatus === "Served & Completed") {
            statusText = "✓ Your order has been hand-delivered by our table staff! Enjoy your dining experience.";
          }

          if (statusText) {
            const msg: Message = {
              id: `status-update-${Date.now()}`,
              sender: "assistant",
              text: statusText,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            };
            setMessages((prev) => [...prev, msg]);
          }
        }
      }
    } catch (err) {
      console.error("Error updating order status:", err);
    }
  };

  const handleUpdatePaymentStatus = async (orderId: string, paid: boolean) => {
    if (!authToken) return;
    try {
      const res = await fetch(`/api/orders/${orderId}/payment`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          paymentMethod: paid ? "Staff Cashier" : "Unpaid",
        }),
      });

      if (res.ok) {
        const updatedOrder = await res.json();
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? updatedOrder : o))
        );
      }
    } catch (err) {
      console.error("Error updating payment status:", err);
    }
  };

  // Admin dynamic controllers
  const handleAddMenuItem = (item: MenuItem) => {
    setMenuItems((prev) => [...prev, item]);
  };

  const handleDeleteMenuItem = (id: string) => {
    setMenuItems((prev) => prev.filter(item => item.id !== id));
  };

  const handleAddTable = (table: TableConfig) => {
    setTables((prev) => [...prev, table]);
  };

  const handleDeleteTable = (id: string) => {
    setTables((prev) => prev.filter(t => t.id !== id));
  };

  const handleSimulateTableScan = (tableNum: string) => {
    setTableNumber(tableNum);
    // Find if this table has an active unpaid order already, so we link it
    const existingUnpaidOrder = orders.find(o => o.tableNumber === tableNum && !o.paymentConfirmed);
    if (existingUnpaidOrder) {
      setActiveOrderId(existingUnpaidOrder.id);
    } else {
      setActiveOrderId(null);
    }
    setCart([]);
    navigateTo("customer");
  };

  const handleResetDatabase = () => {
    setMenuItems(MENU_ITEMS);
    setTables(INITIAL_TABLES);
    setOrders([]);
    setCart([]);
    setActiveOrderId(null);
    setTableNumber("07");
    setMessages([
      {
        id: "welcome",
        sender: "assistant",
        text: "Database was safely reset. Welcome to **Toco Speciality**! ☕✨\n\nHow may I elevate your dining experience today?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    localStorage.clear();
  };

  // Fuzzy matching dynamic menu items by name
  const findMenuItem = (name: string): MenuItem | undefined => {
    if (!name) return undefined;
    const lower = name.toLowerCase().trim();
    return menuItems.find(
      (item) =>
        lower.includes(item.name.toLowerCase()) ||
        item.name.toLowerCase().includes(lower) ||
        item.id.toLowerCase() === lower
    );
  };

  // Execute AI action returned by server-side Gemini
  const handleExecuteAIAction = (action: any) => {
    if (!action || !action.type) return;

    switch (action.type) {
      case "add": {
        const item = findMenuItem(action.itemName);
        if (item) {
          handleAddToCart(item, action.customization || "Standard Choice", action.quantity || 1);
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
        break;
      }
      case "place_order": {
        if (cart.length > 0) {
          handlePlaceOrder(tableNumber);
        }
        break;
      }
      case "pay": {
        const activeOrder = getActiveOrder();
        if (activeOrder && !activeOrder.paymentConfirmed) {
          handleConfirmPayment("Digital AI Wallet");
        }
        break;
      }
      case "update_status": {
        if (activeOrderId && action.newStatus) {
          handleUpdateOrderStatus(activeOrderId, action.newStatus);
        }
        break;
      }
      default:
        break;
    }
  };

  const activeOrder = getActiveOrder();

  // Helper check for authorization
  const isViewBlocked = 
    (currentView === "staff" && !staffAuthorized) || 
    (currentView === "admin" && !adminAuthorized);

  return (
    <div className="min-h-screen bg-[#FBF9F6] text-stone-900 pb-16 selection:bg-gold-200 selection:text-stone-900 font-sans">
      
      {/* Luxury Minimalist Header */}
      <header className="border-b border-stone-200/50 bg-[#FBF9F6]/85 backdrop-blur-md sticky top-0 z-40 transition-all">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          
          {/* Logo brand */}
          <button 
            onClick={() => navigateTo("customer")} 
            className="flex items-center gap-2 cursor-pointer text-left group transition-all"
          >
            <span className="text-xl font-serif font-black tracking-[0.2em] text-stone-950 uppercase group-hover:text-gold-700 transition-colors">
              Toco <span className="text-gold-600 font-light italic font-serif">Speciality</span>
            </span>
          </button>

          {/* Minimalist Right Header Actions */}
          <div className="flex items-center gap-4">
            
            {/* Show current location indicator */}
            {currentView === "customer" && (
              <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-stone-500 uppercase tracking-wider bg-stone-100 px-3.5 py-1.5 rounded-full border border-stone-200">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Lounge Session Table {tableNumber}
              </div>
            )}

            {/* Google Identity Header Widget */}
            {firebaseUser ? (
              <div className="flex items-center gap-3">
                <div className="hidden md:flex flex-col items-end text-right">
                  <span className="text-xs font-bold text-stone-850">{firebaseUser.displayName || "Lounge Guest"}</span>
                  <span className="text-[9px] font-mono text-stone-400 capitalize">{userProfile?.role || "customer"} Account</span>
                </div>
                {firebaseUser.photoURL ? (
                  <img
                    src={firebaseUser.photoURL}
                    alt="avatar"
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full border border-stone-200"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gold-100 border border-gold-200 flex items-center justify-center text-xs font-bold text-gold-700 font-mono">
                    {(firebaseUser.email || "G")[0].toUpperCase()}
                  </div>
                )}
                <button
                  onClick={() => signOut(auth)}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-600 px-3 py-1.5 rounded-lg text-xs font-display font-medium transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => signInWithPopup(auth, googleAuthProvider)}
                className="bg-stone-950 text-gold-200 hover:bg-gold-600 hover:text-stone-950 px-3.5 py-1.5 rounded-xl text-xs font-display font-semibold transition-all shadow-sm cursor-pointer"
              >
                Sign In
              </button>
            )}

            {currentView !== "customer" && (
              // Exit secure portal button for staff/admin
              <button
                onClick={handleLockSession}
                className="flex items-center gap-1.5 bg-stone-950 text-gold-200 hover:bg-gold-600 hover:text-stone-950 px-4 py-2 rounded-xl text-xs font-display font-semibold uppercase tracking-wider transition-all duration-300 shadow-md cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Lock Portal
              </button>
            )}
          </div>
        </div>
      </header>

      {/* RENDER BODY */}
      <main className="max-w-7xl mx-auto px-6 mt-8">
        
        <AnimatePresence mode="wait">
          
          {/* SECURE ROUTE AUTH GATE */}
          {isViewBlocked ? (
            <motion.div
              key="auth-gate"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="max-w-md mx-auto my-12"
            >
              <div className="bg-[#1A1816] text-[#F3EFEB] rounded-3xl p-8 shadow-2xl border border-stone-850 flex flex-col items-center">
                
                {/* Padlock Icon Header */}
                <div className="w-16 h-16 bg-gradient-to-br from-gold-500 to-gold-700 text-stone-950 rounded-2xl flex items-center justify-center mb-6 shadow-xl relative">
                  <Lock className="w-7 h-7" />
                  <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#1A1816]" />
                </div>

                <span className="text-[10px] font-mono tracking-[0.25em] text-gold-400 uppercase font-black">
                  Toco Lounge Terminal
                </span>
                <h2 className="text-2xl font-serif font-medium text-stone-100 mt-2 text-center">
                  {currentView === "staff" ? "Staff Operations" : "Boutique Administration"}
                </h2>

                {!firebaseUser ? (
                  <>
                    <p className="text-stone-400 text-xs mt-2.5 text-center max-w-[300px] font-light leading-relaxed">
                      This terminal is restricted. Please authenticate using your Google account to verify your role.
                    </p>

                    <button
                      onClick={() => signInWithPopup(auth, googleAuthProvider)}
                      className="w-full mt-8 bg-white text-stone-900 hover:bg-stone-100 py-3.5 px-6 rounded-xl font-display font-bold text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer flex items-center justify-center gap-2.5"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.66-1-.66-2.09-.66-3.09s0-2.09.66-3.09z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      Sign In with Google
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-red-400 text-xs mt-3 text-center max-w-[300px] font-medium bg-red-950/30 border border-red-900/40 p-3 rounded-xl">
                      Access Denied: Your Google account ({firebaseUser.email}) does not have staff or administrator role permissions.
                    </p>

                    <p className="text-stone-400 text-[11px] mt-4 text-center leading-normal">
                      Please sign out below and use an authorized account, or contact the café system manager to grant roles on the register database.
                    </p>

                    <div className="flex flex-col gap-3 w-full mt-6">
                      <button
                        onClick={() => signOut(auth)}
                        className="w-full bg-stone-900 hover:bg-stone-850 text-white py-3 rounded-xl font-display font-semibold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        Sign Out / Switch Identity
                      </button>
                    </div>
                  </>
                )}

                {/* Cancel link */}
                <button
                  onClick={() => navigateTo("customer")}
                  className="mt-6 text-xs text-stone-500 hover:text-stone-300 font-display font-medium uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Return to Café
                </button>

              </div>
            </motion.div>
          ) : (
            
            // MAIN SCREENS SWITCHER
            <div className="space-y-8">
              
              {/* VIEW 1: CUSTOMER VIEW */}
              {currentView === "customer" && (
                <motion.div
                  key="customer-screen"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-10"
                >
                  
                  {/* Brand & Ambiance Showcase Bento Board */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Tile 1: Elegant Branding Wall Image (images.jpg) */}
                    <div className="lg:col-span-2 relative h-80 rounded-[2.5rem] overflow-hidden shadow-2xl border border-stone-200/50 flex items-center justify-end bg-stone-200">
                      <img
                        src="images.jpg"
                        alt="Toco Speciality Marble Wall branding logo"
                        referrerPolicy="no-referrer"
                        className="absolute inset-0 w-full h-full object-cover select-none scale-102 group-hover:scale-100 transition-transform duration-700"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-stone-950/90 via-stone-950/55 to-stone-900/20 flex flex-col justify-end p-8 md:p-10 text-white">
                        <span className="text-[10px] font-mono tracking-[0.3em] text-gold-400 uppercase font-black mb-3.5 flex items-center gap-2">
                          <Award className="w-4 h-4 text-gold-400" />
                          Michelin Award Coffee Roastery
                        </span>
                        <h1 className="text-4xl md:text-5xl font-serif font-semibold text-stone-100 tracking-wide mb-3">
                          Toco Speciality
                        </h1>
                        <p className="text-xs md:text-sm text-stone-300 font-light max-w-lg leading-relaxed">
                          Our sensory space features custom polished grey marble walls, custom warm cherry-wood cabinetry, and the quiet, soothing hum of freshly roasted beans. Discover signature blends curated by world-class baristas.
                        </p>
                      </div>
                    </div>

                    {/* Tile 2: Table Status Overview */}
                    <div className="bg-gradient-to-br from-[#1E1B18] to-[#12100E] text-[#F3EFEB] rounded-[2.5rem] p-8 shadow-2xl border border-stone-900 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-[9px] font-mono tracking-[0.2em] text-gold-400 uppercase font-bold">
                            Table Link Active
                          </span>
                          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10B981]" />
                        </div>
                        <h2 className="text-4xl font-serif font-semibold text-gold-100">
                          Table {tableNumber}
                        </h2>
                        <div className="text-stone-400 text-xs mt-4 leading-relaxed font-light">
                          Your physical dining counter is connected. Select delicacies below or dictate your specific preferences to our integrated AI concierge.
                        </div>
                      </div>

                      <div className="mt-8 pt-5 border-t border-stone-800/80 flex items-center justify-between text-[11px] font-mono text-stone-500">
                        <span className="flex items-center gap-2 text-stone-400">
                          <MapPin className="w-3.5 h-3.5 text-gold-500" />
                          Marble Counter Sec A
                        </span>
                        <span>EST. 2026</span>
                      </div>
                    </div>
                  </div>

                  {/* Core Customer Area */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Left panel: Interactive Gourmet Menu (7 cols on Desktop) */}
                    <div className="lg:col-span-7 space-y-8">
                      <div className="mb-2">
                        <span className="text-[10px] font-mono text-gold-600 font-bold uppercase tracking-[0.25em]">
                          Our Masterpieces
                        </span>
                        <h2 className="text-3xl font-serif font-semibold text-stone-950 mt-1">
                          The Lounge Menu
                        </h2>
                      </div>

                      <MenuSection menuItems={menuItems} onAddToCart={handleAddToCart} />
                    </div>

                    {/* Right panel: Cart, Live Order Tracking, AI Chat (5 cols on Desktop) */}
                    <div className="lg:col-span-5 space-y-6">
                      
                      {/* Section A: Live Order Tracker (Displayed if order is active) */}
                      {activeOrder && (
                        <OrderTracker
                          status={activeOrder.status}
                          items={activeOrder.items}
                          tableNumber={tableNumber}
                        />
                      )}

                      {/* Section B: Toco AI Concierge Chat Workspace */}
                      <ChatAssistant
                        messages={messages}
                        onAddMessage={(msg) => setMessages((prev) => [...prev, msg])}
                        cart={cart}
                        orderStatus={activeOrder ? activeOrder.status : "Received"}
                        menuItems={menuItems}
                        onExecuteAIAction={handleExecuteAIAction}
                      />

                      {/* Section C: Visual Cart and Receipt Breakdown */}
                      <CartDrawer
                        cart={cart}
                        onUpdateQuantity={handleUpdateQuantity}
                        onRemoveItem={handleRemoveItem}
                        onPlaceOrder={handlePlaceOrder}
                        activeOrder={activeOrder}
                        onConfirmPayment={handleConfirmPayment}
                        tableNumber={tableNumber}
                        setTableNumber={setTableNumber}
                      />
                    </div>
                  </div>

                  {/* Customer Lounge footer */}
                  <footer className="border-t border-stone-200/60 pt-10 mt-20 text-center sm:text-left pb-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                      <div className="space-y-1">
                        <span className="text-xs font-serif font-black tracking-[0.2em] text-stone-950 uppercase">
                          Toco <span className="text-gold-700 font-light italic">Speciality</span>
                        </span>
                        <p className="text-[10px] text-stone-400 font-sans tracking-wide leading-relaxed">
                          Authorized Register Terminal • Secure checkout powered by Toco Lounge System. All rights reserved © 2026.
                        </p>
                      </div>
                      
                      {/* Secure Portals Trigger Buttons */}
                      <div className="flex items-center gap-2.5">
                        <button
                          id="btn-staff-portal"
                          onClick={() => navigateTo("staff")}
                          className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[10px] font-sans font-bold uppercase tracking-[0.1em] text-stone-600 hover:text-stone-950 bg-white hover:bg-stone-50 border border-stone-200/70 hover:border-stone-400 transition-all duration-300 cursor-pointer shadow-2xs"
                        >
                          <ChefHat className="w-3.5 h-3.5 text-stone-400" />
                          Staff Portal
                        </button>
                        <button
                          id="btn-admin-portal"
                          onClick={() => navigateTo("admin")}
                          className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[10px] font-sans font-bold uppercase tracking-[0.1em] text-stone-600 hover:text-stone-950 bg-white hover:bg-stone-50 border border-stone-200/70 hover:border-stone-400 transition-all duration-300 cursor-pointer shadow-2xs"
                        >
                          <Settings className="w-3.5 h-3.5 text-stone-400" />
                          Admin System
                        </button>
                      </div>
                    </div>
                  </footer>

                </motion.div>
              )}

              {/* VIEW 2: STAFF KITCHEN TERMINAL */}
              {currentView === "staff" && staffAuthorized && (
                <motion.div
                  key="staff-screen"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-xs font-mono text-gold-600 font-bold uppercase tracking-widest">
                        Live Operations
                      </span>
                      <h1 className="text-3xl font-serif font-bold text-stone-900 mt-1">
                        Kitchen & Lounge Hub
                      </h1>
                    </div>
                  </div>

                  <StaffDashboard
                    orders={orders}
                    tables={tables}
                    onUpdateOrderStatus={handleUpdateOrderStatus}
                    onUpdatePaymentStatus={handleUpdatePaymentStatus}
                  />
                </motion.div>
              )}

              {/* VIEW 3: ADMIN PANEL */}
              {currentView === "admin" && adminAuthorized && (
                <motion.div
                  key="admin-screen"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-xs font-mono text-gold-600 font-bold uppercase tracking-widest">
                        Systems Management
                      </span>
                      <h1 className="text-3xl font-serif font-bold text-stone-900 mt-1">
                        Boutique Operations Hub
                      </h1>
                    </div>
                  </div>

                  <AdminPanel
                    menuItems={menuItems}
                    tables={tables}
                    orders={orders}
                    onAddMenuItem={handleAddMenuItem}
                    onDeleteMenuItem={handleDeleteMenuItem}
                    onAddTable={handleAddTable}
                    onDeleteTable={handleDeleteTable}
                    onResetDatabase={handleResetDatabase}
                    onSimulateTableScan={handleSimulateTableScan}
                    usersList={usersList}
                    onUpdateUserRole={handleUpdateUserRole}
                  />
                </motion.div>
              )}

            </div>
          )}
          
        </AnimatePresence>

      </main>
    </div>
  );
}
