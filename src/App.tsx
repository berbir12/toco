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
  Lock, ArrowLeft, Unlock, AlertCircle, Sparkles, LogOut, CheckCircle, ShoppingBag
} from "lucide-react";

// Firebase Auth Client
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth, googleAuthProvider } from "./lib/firebase.ts";

const INITIAL_TABLES: TableConfig[] = Array.from({ length: 20 }, (_, i) => {
  const num = String(i + 1).padStart(2, "0");
  const seats = [2, 4, 6][i % 3];
  return {
    id: `t${i + 1}`,
    tableNumber: num,
    seatsCount: seats,
    status: "Available"
  };
});

export default function App() {
  // Hash Routing State
  const [currentView, setCurrentView] = useState<"customer" | "staff" | "admin">("customer");

  // Mobile active tab for customer view (menu vs AI assistant & cart)
  const [mobileTab, setMobileTab] = useState<"menu" | "assistant">("menu");

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

  // Elegant Custom Toast Notification
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const showToastMessage = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((curr) => curr?.message === message ? null : curr);
    }, 4500);
  };

  // Dynamic States
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<TableConfig[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableNumber, setTableNumber] = useState<string>(() => {
    // Check URL params first
    try {
      const searchParams = new URLSearchParams(window.location.search);
      let tableParam = searchParams.get("table");
      if (!tableParam && window.location.hash.includes("?")) {
        const hashParams = new URLSearchParams(window.location.hash.split("?")[1]);
        tableParam = hashParams.get("table");
      }
      if (tableParam) {
        return tableParam;
      }
    } catch (e) {
      console.error("Error parsing URL parameters in state initializer", e);
    }

    // Then check localStorage
    const savedTableNumber = localStorage.getItem("toco_tableNumber");
    if (savedTableNumber) {
      return savedTableNumber;
    }

    return "07";
  });

  const [activeOrderId, setActiveOrderId] = useState<string | null>(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      let tableParam = searchParams.get("table");
      if (!tableParam && window.location.hash.includes("?")) {
        const hashParams = new URLSearchParams(window.location.hash.split("?")[1]);
        tableParam = hashParams.get("table");
      }
      const savedTableNumber = localStorage.getItem("toco_tableNumber");
      if (tableParam && savedTableNumber && tableParam !== savedTableNumber) {
        // Table changed! Discard old active order ID from previous table
        return null;
      }
    } catch (e) {
      console.error(e);
    }
    return localStorage.getItem("toco_activeOrderId");
  });

  // Initial greeting chat message from the Toco Concierge
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "Welcome to **Toco Speciality**! ☕✨ I am your virtual AI host.\n\nHere against our elegant **grey marble counter** and premium wood shelving, we craft award-winning speciality coffees and gourmet signature plates.\n\nHow may I elevate your dining experience today? Feel free to ask me to **recommend a pairing**, **add items to your order**, **check status**, or **settle the bill**!",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  // Subdomain auto-routing for cPanel deployment
  useEffect(() => {
    const hostname = window.location.hostname;
    if (hostname.includes("stafftoco")) {
      window.location.hash = "#/staff";
    } else if (hostname.includes("admintoco")) {
      window.location.hash = "#/admin";
    } else if (hostname.includes("tocospecialty")) {
      window.location.hash = "#/";
    }
  }, []);

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

  // Guest and passcode-based session initialization
  useEffect(() => {
    setIsLoadingAuth(true);
    let token = localStorage.getItem("toco_auth_token");
    if (!token) {
      // Generate a clean guest customer ID automatically
      token = `guest_${Math.random().toString(36).substring(2, 11)}`;
      localStorage.setItem("toco_auth_token", token);
    }

    setAuthToken(token);

    if (token.startsWith("passcode_")) {
      const code = token.split("passcode_")[1];
      if (code === "888888") {
        setUserProfile({ uid: "admin_passcode", email: "admin@tocospeciality.com", role: "admin", dbId: 888888 });
        setAdminAuthorized(true);
        setStaffAuthorized(true);
      } else if (code === "222222") {
        setUserProfile({ uid: "staff_passcode", email: "staff@tocospeciality.com", role: "staff", dbId: 222222 });
        setStaffAuthorized(true);
        setAdminAuthorized(false);
      } else {
        // Invalid passcode fallback to guest session
        const guestToken = `guest_${Math.random().toString(36).substring(2, 11)}`;
        localStorage.setItem("toco_auth_token", guestToken);
        setAuthToken(guestToken);
        setUserProfile({ uid: guestToken, email: "guest@tocospeciality.com", role: "customer", dbId: 999999 });
        setStaffAuthorized(false);
        setAdminAuthorized(false);
      }
    } else {
      setUserProfile({ uid: token, email: "guest@tocospeciality.com", role: "customer", dbId: 999999 });
      setStaffAuthorized(false);
      setAdminAuthorized(false);
    }
    setIsLoadingAuth(false);
  }, []);

  // Fetch Database Orders
  const fetchOrdersFromDB = async (tableNumToQuery?: string) => {
    if (!authToken) return;
    const activeTable = tableNumToQuery || tableNumber;
    try {
      const res = await fetch(`/api/orders?table=${activeTable}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (res.ok) {
        const dbOrders = await res.json();
        setOrders(dbOrders);

        // Sync active unpaid order for this specific table
        const activeUnpaid = dbOrders.find((o: any) => o.tableNumber === activeTable && !o.paymentConfirmed);
        if (activeUnpaid) {
          setActiveOrderId(activeUnpaid.id);
        } else {
          setActiveOrderId(null);
        }
      }
    } catch (err) {
      console.error("Failed to load database orders:", err);
    }
  };

  useEffect(() => {
    let isCurrent = true;

    const fetchOrders = async () => {
      if (!authToken) return;
      const activeTable = tableNumber;
      try {
        const res = await fetch(`/api/orders?table=${activeTable}`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        if (res.ok && isCurrent) {
          const dbOrders = await res.json();
          setOrders(dbOrders);

          // Sync active unpaid order for this specific table
          const activeUnpaid = dbOrders.find((o: any) => o.tableNumber === activeTable && !o.paymentConfirmed);
          if (activeUnpaid) {
            setActiveOrderId(activeUnpaid.id);
          } else {
            setActiveOrderId(null);
          }
        }
      } catch (err) {
        console.error("Failed to load database orders:", err);
      }
    };

    fetchOrders();
    
    // Poll every 5s if logged in and has access to kitchen / admin panel
    let interval: any;
    if (authToken && (userProfile?.role === "staff" || userProfile?.role === "admin")) {
      interval = setInterval(() => {
        if (isCurrent) fetchOrders();
      }, 5000);
    }
    return () => {
      isCurrent = false;
      if (interval) clearInterval(interval);
    };
  }, [authToken, userProfile?.role, tableNumber]);

  // Handle redirect from Chapa payment
  useEffect(() => {
    if (!authToken) return;

    const params = new URLSearchParams(window.location.search);
    const success = params.get("payment_success");
    const orderId = params.get("order_id");
    const isMock = params.get("mock_chapa");

    if ((success === "true" || isMock === "true") && orderId) {
      const verifyChapaPayment = async () => {
        try {
          const res = await fetch(`/api/orders/${orderId}/chapa-verify`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
          });
          if (res.ok) {
            const updatedOrder = await res.json();
            // Sync orders state
            setOrders((prev) =>
              prev.map((o) => (o.id === orderId ? updatedOrder : o))
            );
            
            // Add a pleasant success message to chat logs
            const msg: Message = {
              id: `chapa-paid-${Date.now()}`,
              sender: "assistant",
              text: `🌟 **Chapa Payment Verified!**\n\nYour transaction has been securely confirmed via **Chapa Mobile**. Thank you for dining with Toco Speciality! Your table host is ready to make your experience perfect.`,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            };
            setMessages((prev) => [...prev, msg]);

            // Clear URL search parameters so they don't trigger on reload
            window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
          }
        } catch (err) {
          console.error("Verification error:", err);
        }
      };

      verifyChapaPayment();
    }
  }, [authToken]);

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
        showToastMessage(`Failed to update user role: ${err.error}`, "error");
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

    if (savedMenu) {
      const parsed = JSON.parse(savedMenu);
      const hasCheapOldPrices = parsed.some((item: any) => item.price < 50);
      if (hasCheapOldPrices) {
        setMenuItems(MENU_ITEMS);
        localStorage.setItem("toco_menuItems", JSON.stringify(MENU_ITEMS));
      } else {
        setMenuItems(parsed);
      }
    }
    else setMenuItems(MENU_ITEMS);

    if (savedTables) {
      const parsed = JSON.parse(savedTables);
      if (parsed.length < 20) {
        setTables(INITIAL_TABLES);
      } else {
        setTables(parsed);
      }
    } else {
      setTables(INITIAL_TABLES);
    }

    if (savedCart) setCart(JSON.parse(savedCart));
    else setCart([]);

    // Synchronize initial values to localStorage if url params differ
    let tableParam = null;
    try {
      const searchParams = new URLSearchParams(window.location.search);
      tableParam = searchParams.get("table");
      if (!tableParam && window.location.hash.includes("?")) {
        const hashParams = new URLSearchParams(window.location.hash.split("?")[1]);
        tableParam = hashParams.get("table");
      }
    } catch (e) {
      console.error("Error parsing URL parameters", e);
    }

    if (tableParam) {
      localStorage.setItem("toco_tableNumber", tableParam);
      if (savedTableNumber && tableParam !== savedTableNumber) {
        // Table changed! Clear previous table's saved active order ID from storage
        localStorage.removeItem("toco_activeOrderId");
      }
    }

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
  const handleLockSession = () => {
    // Return to a guest customer token
    const guestToken = `guest_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem("toco_auth_token", guestToken);
    setAuthToken(guestToken);
    setUserProfile({ uid: guestToken, email: "guest@tocospeciality.com", role: "customer", dbId: 999999 });
    setStaffAuthorized(false);
    setAdminAuthorized(false);
    setPinInput("");
    setPinError(null);
    navigateTo("customer");
  };

  const handleAuthorizeSuccess = (role: "staff" | "admin") => {
    if (role === "staff") {
      setStaffAuthorized(true);
    } else {
      setAdminAuthorized(true);
      setStaffAuthorized(true);
    }
    setPinInput("");
    setPinError(null);
  };

  // Interactive PIN pad click (6-digit passcode)
  const handlePinKeyPress = (val: string) => {
    setPinError(null);
    if (pinInput.length >= 6) return;
    const nextPin = pinInput + val;
    setPinInput(nextPin);

    // Auto trigger submission when reaching 6 digits
    if (nextPin.length === 6) {
      setIsAuthenticating(true);
      setTimeout(() => {
        setIsAuthenticating(false);
        if (currentView === "staff") {
          if (nextPin === "222222") {
            const token = "passcode_222222";
            localStorage.setItem("toco_auth_token", token);
            setAuthToken(token);
            setUserProfile({ uid: "staff_passcode", email: "staff@tocospeciality.com", role: "staff", dbId: 222222 });
            handleAuthorizeSuccess("staff");
          } else {
            setPinError("Invalid Staff Passcode (6 digits)");
            setPinInput("");
          }
        } else if (currentView === "admin") {
          if (nextPin === "888888") {
            const token = "passcode_888888";
            localStorage.setItem("toco_auth_token", token);
            setAuthToken(token);
            setUserProfile({ uid: "admin_passcode", email: "admin@tocospeciality.com", role: "admin", dbId: 888888 });
            handleAuthorizeSuccess("admin");
          } else {
            setPinError("Invalid Administration Passcode (6 digits)");
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
      showToastMessage("Initializing your guest lounge session. Please try again in a brief second.", "info");
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
        showToastMessage(`Failed to submit order: ${err.error}`, "error");
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

        if (updatedOrder.paymentConfirmed) {
          const msg: Message = {
            id: `order-paid-${Date.now()}`,
            sender: "assistant",
            text: `💳 **Payment Confirmed!**\n\nThank you for settling your bill via **${method}**. We hope you enjoyed your signature coffees and cuisine at **Toco Speciality**. Have a fantastic day!`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
          setMessages((prev) => [...prev, msg]);
        } else {
          const msg: Message = {
            id: `order-call-server-${Date.now()}`,
            sender: "assistant",
            text: `🛎️ **Staff Notified!**\n\nWe have notified our floor staff that you would like to settle your bill. A waiter will bring a physical credit/debit card terminal or process cash right at **Table ${activeOrder.tableNumber}**. Please wait a moment.`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
          setMessages((prev) => [...prev, msg]);
        }
      }
    } catch (err) {
      console.error("Payment error:", err);
    }
  };

  const handleChapaPayment = async () => {
    const activeOrder = getActiveOrder();
    if (!activeOrder || !authToken) return;
    
    try {
      const res = await fetch(`/api/orders/${activeOrder.id}/chapa-initialize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.checkoutUrl) {
          // Open Chapa checkout link
          window.open(data.checkoutUrl, "_blank");
        } else {
          showToastMessage("Unable to generate payment link. Please try again.", "error");
        }
      } else {
        const err = await res.json();
        showToastMessage(`Failed to initialize Chapa payment: ${err.error || err.message}`, "error");
      }
    } catch (err) {
      console.error("Chapa initialization error:", err);
      showToastMessage("Network error while connecting to Chapa payment system.", "error");
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

  const handleUpdateActiveOrderItems = async (updatedItems: any[]) => {
    if (!activeOrderId || !authToken) return;

    const subtotal = updatedItems.reduce((acc, item) => acc + Number(item.price) * Number(item.quantity), 0);
    const vat = subtotal * 0.10;
    const serviceCharge = subtotal * 0.05;
    const total = subtotal + vat + serviceCharge;

    try {
      const res = await fetch(`/api/orders/${activeOrderId}/update`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          items: updatedItems.map(item => ({
            menuItemId: item.menuItemId,
            name: item.name,
            price: Number(item.price),
            quantity: Number(item.quantity),
            customization: item.customization || {},
          })),
          subtotal,
          vat,
          serviceCharge,
          total,
        }),
      });

      if (res.ok) {
        const updatedOrder = await res.json();
        setOrders((prev) =>
          prev.map((o) => (o.id === activeOrderId ? updatedOrder : o))
        );
        
        // Push a nice confirmation message to chat assistant logs
        const msg: Message = {
          id: `order-updated-${Date.now()}`,
          sender: "assistant",
          text: `📝 **Your Order on Table ${tableNumber} has been updated!**\n\nWe've successfully updated your choices in the kitchen register. The total is now **${total.toFixed(2)} ETB**. The preparation status is still **Received**!`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, msg]);
      } else {
        const err = await res.json();
        showToastMessage(`Failed to update order: ${err.error || "Please try again."}`, "error");
      }
    } catch (err) {
      console.error("Error updating active order:", err);
    }
  };

  const handleMergeCartIntoActiveOrder = async () => {
    const activeOrder = getActiveOrder();
    if (!activeOrder || cart.length === 0) return;

    // Merge existing items from the active order with items in the cart
    const mergedItems = [...activeOrder.items];

    cart.forEach(cartItem => {
      // Look for match based on menuItemId and customization milk/notes
      const existingIdx = mergedItems.findIndex(
        item => item.menuItemId === cartItem.menuItemId &&
                item.customization?.milk === cartItem.customization?.milk &&
                item.customization?.notes === cartItem.customization?.notes
      );

      if (existingIdx !== -1) {
        mergedItems[existingIdx].quantity += cartItem.quantity;
      } else {
        mergedItems.push({
          id: cartItem.id,
          orderId: activeOrder.id,
          menuItemId: cartItem.menuItemId,
          name: cartItem.name,
          price: cartItem.price,
          quantity: cartItem.quantity,
          customization: cartItem.customization || {},
        } as any);
      }
    });

    await handleUpdateActiveOrderItems(mergedItems);
    setCart([]); // Clear cart after merging
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
          handleConfirmPayment("Call Server");
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
            
            {/* Show current location indicator for customers */}
            {currentView === "customer" && (
              <div className="flex items-center gap-2 text-xs font-mono text-stone-600 uppercase tracking-wider bg-stone-100 px-4 py-2 rounded-full border border-stone-200 shadow-2xs">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                Lounge Session • Table {tableNumber}
              </div>
            )}

            {/* Staff / Admin authorized controls */}
            {currentView !== "customer" && !isViewBlocked && (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end text-right">
                  <span className="text-xs font-bold text-stone-850 capitalize">{userProfile?.role || "Staff"} Terminal</span>
                  <span className="text-[9px] font-mono text-stone-400">Secure Passcode Session</span>
                </div>
                <button
                  onClick={handleLockSession}
                  className="flex items-center gap-1.5 bg-stone-950 text-gold-200 hover:bg-gold-600 hover:text-stone-950 px-4 py-2 rounded-xl text-xs font-display font-semibold uppercase tracking-wider transition-all duration-300 shadow-md cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Lock Portal
                </button>
              </div>
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
              className="max-w-md mx-auto my-8"
            >
              <div className="bg-[#1A1816] text-[#F3EFEB] rounded-3xl p-8 shadow-2xl border border-stone-800 flex flex-col items-center">
                
                {/* Padlock Icon Header */}
                <div className="w-16 h-16 bg-gradient-to-br from-gold-500 to-gold-700 text-stone-950 rounded-2xl flex items-center justify-center mb-5 shadow-xl relative">
                  <Lock className="w-7 h-7" />
                  <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#1A1816]" />
                </div>

                <span className="text-[10px] font-mono tracking-[0.25em] text-gold-400 uppercase font-black">
                  Toco Lounge Terminal
                </span>
                <h2 className="text-xl font-serif font-medium text-stone-100 mt-2 text-center">
                  {currentView === "staff" ? "Staff Operations Gate" : "Boutique Administration Gate"}
                </h2>

                <p className="text-stone-400 text-xs mt-2 text-center max-w-[300px] font-light leading-relaxed">
                  Please key in the 6-digit terminal passcode to access this section.
                </p>

                {/* 6-digit Display Slots */}
                <div className="flex gap-2.5 my-6 justify-center">
                  {Array.from({ length: 6 }).map((_, idx) => {
                    const isFilled = idx < pinInput.length;
                    return (
                      <div
                        key={idx}
                        className={`w-4 h-4 rounded-full transition-all duration-200 ${
                          isFilled
                            ? "bg-gold-500 shadow-[0_0_10px_#D97706] scale-110"
                            : "bg-stone-900 border border-stone-700"
                        }`}
                      />
                    );
                  })}
                </div>

                {/* Error Banner */}
                {pinError && (
                  <div className="flex items-center gap-1.5 bg-red-950/40 text-red-400 border border-red-900/40 rounded-xl px-4 py-2.5 text-[11px] font-medium tracking-wide mb-6 max-w-xs text-center">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{pinError}</span>
                  </div>
                )}

                {/* Tactile Keypad Grid */}
                <div className="grid grid-cols-3 gap-3.5 w-full max-w-[280px]">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                    <button
                      key={num}
                      onClick={() => handlePinKeyPress(num)}
                      className="w-16 h-16 rounded-full bg-stone-900 hover:bg-stone-850 active:scale-95 text-xl font-sans font-bold text-stone-100 border border-stone-800/80 transition-all cursor-pointer flex items-center justify-center shadow-sm select-none"
                    >
                      {num}
                    </button>
                  ))}
                  
                  {/* Clear Button */}
                  <button
                    onClick={handlePinClear}
                    className="w-16 h-16 rounded-full bg-stone-950 text-xs text-stone-400 hover:text-stone-200 active:scale-95 transition-all cursor-pointer flex items-center justify-center font-display uppercase tracking-widest font-black"
                  >
                    Clear
                  </button>
                  
                  {/* Zero Button */}
                  <button
                    onClick={() => handlePinKeyPress("0")}
                    className="w-16 h-16 rounded-full bg-stone-900 hover:bg-stone-850 active:scale-95 text-xl font-sans font-bold text-stone-100 border border-stone-800/80 transition-all cursor-pointer flex items-center justify-center shadow-sm select-none"
                  >
                    0
                  </button>

                  {/* Backspace Button */}
                  <button
                    onClick={handlePinDelete}
                    className="w-16 h-16 rounded-full bg-stone-950 text-xs text-stone-400 hover:text-stone-200 active:scale-95 transition-all cursor-pointer flex items-center justify-center font-sans"
                  >
                    ⌫
                  </button>
                </div>

                {/* Cancel link */}
                <button
                  onClick={() => navigateTo("customer")}
                  className="mt-8 text-xs text-stone-500 hover:text-stone-300 font-display font-medium uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* Tile 1: Elegant Branding Wall Image (images.jpg) */}
                    <div className="md:col-span-2 relative h-48 sm:h-64 md:h-80 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden shadow-xl border border-stone-200/50 flex items-center justify-end bg-stone-200">
                      <img
                        src="images.jpg"
                        alt="Toco Speciality Marble Wall branding logo"
                        referrerPolicy="no-referrer"
                        className="absolute inset-0 w-full h-full object-cover select-none scale-102 group-hover:scale-100 transition-transform duration-700"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-stone-950/90 via-stone-950/55 to-stone-900/20 flex flex-col justify-end p-5 md:p-10 text-white">
                        <span className="text-[9px] md:text-[10px] font-mono tracking-[0.3em] text-gold-400 uppercase font-black mb-2 md:mb-3.5 flex items-center gap-2">
                          <Award className="w-3.5 h-3.5 md:w-4 md:h-4 text-gold-400" />
                          Michelin Award Coffee Roastery
                        </span>
                        <h1 className="text-2xl md:text-5xl font-serif font-semibold text-stone-100 tracking-wide mb-1 md:mb-3">
                          Toco Speciality
                        </h1>
                        <p className="text-[10px] md:text-sm text-stone-300 font-light max-w-lg leading-relaxed line-clamp-2 md:line-clamp-none">
                          Our sensory space features custom polished grey marble walls, custom warm cherry-wood cabinetry, and the quiet, soothing hum of freshly roasted beans. Discover signature blends curated by world-class baristas.
                        </p>
                      </div>
                    </div>

                    {/* Tile 2: Table Status Overview */}
                    <div className="bg-gradient-to-br from-[#1E1B18] to-[#12100E] text-[#F3EFEB] rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-xl border border-stone-900 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-3 md:mb-4">
                          <span className="text-[9px] font-mono tracking-[0.2em] text-gold-400 uppercase font-bold">
                            Table Link Active
                          </span>
                          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10B981]" />
                        </div>
                        <h2 className="text-2xl md:text-4xl font-serif font-semibold text-gold-100">
                          Table {tableNumber}
                        </h2>
                        <p className="text-stone-400 text-[11px] md:text-xs mt-3 leading-relaxed font-light">
                          Your physical dining counter is connected. Select delicacies below or dictate your specific preferences to our integrated AI concierge.
                        </p>
                      </div>

                      <div className="mt-6 md:mt-8 pt-4 md:pt-5 border-t border-stone-800/80 flex items-center justify-between text-[10px] md:text-[11px] font-mono text-stone-500">
                        <span className="flex items-center gap-2 text-stone-400">
                          <MapPin className="w-3.5 h-3.5 text-gold-500" />
                          Marble Counter Sec A
                        </span>
                        <span>EST. 2026</span>
                      </div>
                    </div>
                  </div>

                  {/* Elegant Tactile Mobile Tab Swapper */}
                  <div className="flex lg:hidden bg-stone-100/80 p-1 rounded-2xl border border-stone-200 gap-1 shadow-2xs">
                    <button
                      onClick={() => setMobileTab("menu")}
                      className={`flex-1 py-3 text-[10px] font-display font-black uppercase tracking-[0.15em] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        mobileTab === "menu"
                          ? "bg-stone-950 text-gold-200 shadow-md scale-102"
                          : "text-stone-500 hover:text-stone-900"
                      }`}
                    >
                      📖 The Gourmet Menu
                    </button>
                    <button
                      onClick={() => setMobileTab("assistant")}
                      className={`flex-1 py-3 text-[10px] font-display font-black uppercase tracking-[0.15em] rounded-xl transition-all cursor-pointer relative flex items-center justify-center gap-2 ${
                        mobileTab === "assistant"
                          ? "bg-stone-950 text-gold-200 shadow-md scale-102"
                          : "text-stone-500 hover:text-stone-900"
                      }`}
                    >
                      💬 Concierge & Tab
                      {cart.length > 0 && (
                        <span className="bg-gold-600 text-stone-950 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-4 text-center animate-pulse">
                          {cart.reduce((sum, item) => sum + item.quantity, 0)}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Core Customer Area */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Left panel: Interactive Gourmet Menu (7 cols on Desktop) */}
                    <div className={`lg:col-span-7 space-y-8 ${mobileTab === "menu" ? "block" : "hidden lg:block"}`}>
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
                    <div className={`lg:col-span-5 space-y-6 ${mobileTab === "assistant" ? "block" : "hidden lg:block"}`}>
                      
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
                        onPayWithChapa={handleChapaPayment}
                        tableNumber={tableNumber}
                        setTableNumber={setTableNumber}
                        onUpdateActiveOrderItems={handleUpdateActiveOrderItems}
                        onMergeCartIntoActiveOrder={handleMergeCartIntoActiveOrder}
                      />
                    </div>
                  </div>

                  {/* Floating Mobile Cart Action Bar */}
                  {currentView === "customer" && mobileTab === "menu" && cart.length > 0 && (
                    <div className="fixed bottom-6 right-6 z-40 lg:hidden">
                      <button
                        onClick={() => setMobileTab("assistant")}
                        className="flex items-center gap-2.5 bg-stone-950 hover:bg-gold-600 text-gold-200 hover:text-stone-950 px-5 py-4 rounded-full shadow-2xl border border-stone-800 cursor-pointer animate-pulse"
                      >
                        <span className="relative">
                          <ShoppingBag className="w-5 h-5" />
                          <span className="absolute -top-1.5 -right-1.5 bg-gold-500 text-stone-950 text-[9px] font-mono font-bold w-4 h-4 rounded-full flex items-center justify-center">
                            {cart.reduce((sum, item) => sum + item.quantity, 0)}
                          </span>
                        </span>
                        <span className="font-sans font-bold text-xs uppercase tracking-wider">
                          Review Tab (${cart.reduce((acc, item) => acc + item.price * item.quantity, 0).toFixed(2)})
                        </span>
                      </button>
                    </div>
                  )}

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

      {/* Elegant Global Custom Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3.5 border text-xs tracking-wider font-semibold ${
              toast.type === "error"
                ? "bg-red-950 text-red-200 border-red-500/30"
                : toast.type === "success"
                ? "bg-stone-950 text-gold-200 border-gold-600/40"
                : "bg-stone-900 text-stone-100 border-stone-700/40"
            }`}
          >
            <div className={`w-2.5 h-2.5 rounded-full animate-ping ${toast.type === "error" ? "bg-red-400" : "bg-gold-400"}`} />
            <span className="font-sans font-bold leading-normal">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
