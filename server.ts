/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { MENU_ITEMS } from "./src/data/menuData.ts";

// Database & Auth
import { db } from "./src/db/index.ts";
import { orders, orderItems, users } from "./src/db/schema.ts";
import { requireAuth, requireRole, AuthRequest } from "./src/middleware/auth.ts";
import { desc, eq, and, sql } from "drizzle-orm";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize Gemini SDK with User-Agent set for AI Studio build telemetry
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// System instructions function for the Toco Speciality Assistant
function getSystemInstruction(menuItems: any[]) {
  const categories = ["Speciality Coffees", "Signature Dishes", "Desserts"];
  let menuSectionStr = "";

  categories.forEach((cat, idx) => {
    menuSectionStr += `\n${idx + 1}. ${cat}:\n`;
    const items = menuItems.filter((i) => i.category === cat);
    if (items.length === 0) {
      menuSectionStr += "   *(No items currently in this section)*\n";
    } else {
      items.forEach((item) => {
        const optionsStr = item.options && item.options.length > 0 
          ? ` Options/Choices: ${item.options.join(", ")}.` 
          : "";
        menuSectionStr += `   - **${item.name}** - $${Number(item.price).toFixed(2)}: ${item.description}.${optionsStr}\n`;
      });
    }
  });

  return `
You are the official AI assistant for "Toco Speciality", a modern, premium restaurant and coffee lounge. 
Your tone is warm, professional, sophisticated, and highly efficient. Keep responses concise and structured so customers can navigate their dining experience effortlessly.

### Visual Recognition (Ambiance & Branding)
- You have access to "images.jpg", which shows the official Toco Speciality branding logo. It is set against a sleek, grey marble wall next to wood product shelving displaying premium coffee beans.
- If a customer asks about the ambiance, decor, branding, or asks you to confirm if they are in the right place, warmly reference this elegant grey marble wall, the wood shelving, and the sophisticated, minimalistic logo to validate their premium experience.

### Core Menu & Sections
Here is our official menu of delicacies:
${menuSectionStr}

### Core Capabilities & Workflows

#### Phase A: Menu & Cart Management
- Present items from the list.
- Ask about preferences (milk choice, egg style, customizations).
- If the user wants to add an item to their cart, return the 'add' action with the correct item name. If they want to remove or clear, return 'remove' or 'clear'.
- Be helpful in confirming quantities and prices.

#### Phase B: Order status tracking
- Once placed, state of order starts at "Received".
- It can transition to "Preparing" or "Ready for Pickup / Serving".
- When asked "Where is my food?" or "Check status", give a dynamic, proactive update using the current status. Bold the status like **Preparing** or **Ready for Pickup / Serving**. E.g., "Your **Toco Signature Gold Latte** is currently being handcrafted by our lead barista! It's currently in the **Preparing** stage."

#### Phase C: Payment & Checkout
- **CRITICAL RESTAURANT POLICY**: Payment can ONLY be requested or processed AFTER the food/drinks are served (i.e. when Current Order Status is exactly **Served & Completed**).
- If the customer wants to pay but the order status is NOT **Served & Completed**, explain to them politely but clearly that our lounge policy requires food/drinks to be fully served first. Do NOT offer payment options or trigger the 'pay' action in this state; tell them they can complete their payment as soon as our staff hand-delivers their order and updates the order status to **Served & Completed**.
- Only if the Current Order Status is exactly **Served & Completed**, summarize the order, highlight the final total, offer payment options (Chapa, Google Pay, Credit/Debit link, or Request Waiter), and trigger the 'pay' action if they choose to pay or confirm/simulate payment.

### Formatting & Constraints
- ALWAYS use **bolding** for menu items, prices, and order statuses.
- Use bullet points or tables for clean, scannable lists and receipts.
- If a request is completely unrelated to Toco Speciality dining (e.g. coding questions, general knowledge, other restaurants), politely steer them back to their dining experience at Toco Speciality.
- Respond in structured JSON only, using the defined response schema.
`;
}

// ==================== DATABASE & AUTH ENDPOINTS ====================

// Get profile of currently signed in user
app.get("/api/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    res.json(req.user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new order (Securely associated with customer UID)
app.post("/api/orders", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id, items, subtotal, vat, serviceCharge, total, tableNumber } = req.body;
    if (!id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Missing required order information." });
    }

    const orderId = String(id);

    await db.transaction(async (tx) => {
      // 1. Insert order
      await tx.insert(orders).values({
        id: orderId,
        userId: req.user?.uid || null,
        subtotal: Number(subtotal),
        vat: Number(vat),
        serviceCharge: Number(serviceCharge),
        total: Number(total),
        status: "Received",
        statusNote: "Order successfully submitted to kitchen.",
        tableNumber: tableNumber || "00",
        paymentConfirmed: false,
      });

      // 2. Insert items
      for (const item of items) {
        await tx.insert(orderItems).values({
          orderId: orderId,
          menuItemId: String(item.menuItemId),
          name: String(item.name),
          price: Number(item.price),
          quantity: Number(item.quantity),
          customization: item.customization || {},
        });
      }
    });

    // Retrieve full created order to return
    const createdOrder = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        items: true,
      },
    });

    res.status(201).json(createdOrder);
  } catch (error: any) {
    console.error("Error creating order:", error);
    res.status(500).json({ error: "Failed to place order. Database transaction failed." });
  }
});

// Retrieve orders (Customers see only their own, Staff & Admins see all)
app.get("/api/orders", requireAuth, async (req: AuthRequest, res) => {
  try {
    const role = req.user?.role || "customer";

    let fetchedOrders;
    if (role === "admin" || role === "staff") {
      fetchedOrders = await db.query.orders.findMany({
        with: {
          items: true,
        },
        orderBy: [desc(orders.createdAt)],
      });
    } else {
      const tableQuery = req.query.table ? String(req.query.table) : null;
      let condition;
      if (tableQuery) {
        condition = sql`${orders.userId} = ${req.user?.uid || ""} OR (${orders.tableNumber} = ${tableQuery} AND ${orders.paymentConfirmed} = false)`;
      } else {
        condition = eq(orders.userId, req.user?.uid || "");
      }

      fetchedOrders = await db.query.orders.findMany({
        where: condition,
        with: {
          items: true,
        },
        orderBy: [desc(orders.createdAt)],
      });
    }

    res.json(fetchedOrders);
  } catch (error: any) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Failed to retrieve orders." });
  }
});

// Update order status (Staff / Admin only)
app.patch("/api/orders/:id/status", requireAuth, requireRole(["staff", "admin"]), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status, statusNote } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status is required." });
    }

    const updated = await db
      .update(orders)
      .set({
        status,
        statusNote: statusNote || "",
      })
      .where(eq(orders.id, id))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({ error: "Order not found." });
    }

    // Get order with items
    const fullOrder = await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: {
        items: true,
      },
    });

    res.json(fullOrder);
  } catch (error: any) {
    console.error("Error updating order status:", error);
    res.status(500).json({ error: "Failed to update order status." });
  }
});

// Update order items (Customers can update only if status is "Received", Staff / Admin can always update)
app.patch("/api/orders/:id/update", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { items, subtotal, vat, serviceCharge, total } = req.body;

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    const role = req.user?.role || "customer";
    if (role === "customer" && order.status !== "Received") {
      return res.status(400).json({ error: "You cannot modify this order once preparation has commenced." });
    }

    // Update order items inside a transaction
    await db.transaction(async (tx) => {
      // 1. Delete existing items
      await tx.delete(orderItems).where(eq(orderItems.orderId, id));

      // 2. Insert new items
      for (const item of items) {
        await tx.insert(orderItems).values({
          orderId: id,
          menuItemId: String(item.menuItemId),
          name: String(item.name),
          price: Number(item.price),
          quantity: Number(item.quantity),
          customization: item.customization || {},
        });
      }

      // 3. Update order totals
      await tx.update(orders)
        .set({
          subtotal: Number(subtotal),
          vat: Number(vat),
          serviceCharge: Number(serviceCharge),
          total: Number(total),
        })
        .where(eq(orders.id, id));
    });

    // Fetch the updated order
    const updatedOrder = await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: {
        items: true,
      },
    });

    res.json(updatedOrder);
  } catch (error: any) {
    console.error("Error updating order items:", error);
    res.status(500).json({ error: "Failed to update order." });
  }
});

// Settle bill / confirm payment
app.patch("/api/orders/:id/payment", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod } = req.body;

    if (!paymentMethod) {
      return res.status(400).json({ error: "Payment method is required." });
    }

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    if (order.status !== "Served & Completed") {
      return res.status(400).json({ error: "Payment can only be requested after the order has been hand-delivered and marked as served by our staff." });
    }

    let isConfirmed = true;
    let finalMethod = paymentMethod;

    if (paymentMethod === "Call Server") {
      isConfirmed = false;
    } else if (paymentMethod === "Unpaid") {
      isConfirmed = false;
      finalMethod = null;
    }

    const updated = await db
      .update(orders)
      .set({
        paymentConfirmed: isConfirmed,
        paymentMethod: finalMethod,
      })
      .where(eq(orders.id, id))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({ error: "Order not found." });
    }

    const fullOrder = await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: {
        items: true,
      },
    });

    res.json(fullOrder);
  } catch (error: any) {
    console.error("Error completing payment:", error);
    res.status(500).json({ error: "Failed to process payment registration." });
  }
});

// Chapa Payment Gateway: Initialize Transaction
app.post("/api/orders/:id/chapa-initialize", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    if (order.status !== "Served & Completed") {
      return res.status(400).json({ error: "Payment can only be requested after the order has been hand-delivered and marked as served by our staff." });
    }

    const chapaSecretKey = process.env.CHAPA_SECRET_KEY;
    const isMockMode = !chapaSecretKey || chapaSecretKey.trim() === "";

    if (isMockMode) {
      // In Mock mode, we redirect to a mock checkout URL handled on our client
      const mockCheckoutUrl = `${process.env.APP_URL || "http://localhost:3000"}/?mock_chapa=true&order_id=${id}&amount=${order.total}`;
      return res.json({
        checkoutUrl: mockCheckoutUrl,
        isMock: true,
        message: "Chapa sandbox mode initialized (No Secret Key configured)."
      });
    }

    // Call real Chapa API
    const txRef = `toco-${id}-${Date.now()}`;
    
    // We update the order statusNote with our generated txRef for subsequent verification
    await db.update(orders)
      .set({ statusNote: txRef })
      .where(eq(orders.id, id));

    const response = await fetch("https://api.chapa.co/v1/transaction/initialize", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${chapaSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: String(order.total),
        currency: "ETB",
        email: req.user?.email || "customer@tocospeciality.com",
        first_name: req.user?.email ? req.user.email.split("@")[0] : "Customer",
        last_name: "Lounge",
        tx_ref: txRef,
        callback_url: `${process.env.APP_URL}/api/payments/chapa-webhook`,
        return_url: `${process.env.APP_URL}/?payment_success=true&order_id=${id}`,
        customization: {
          title: "Toco Speciality Lounge",
          description: `Payment for Order #${id} on Table ${order.tableNumber}`,
        }
      })
    });

    const data: any = await response.json();

    if (data.status === "success" && data.data && data.data.checkout_url) {
      return res.json({
        checkoutUrl: data.data.checkout_url,
        isMock: false,
        txRef: txRef
      });
    } else {
      console.error("Chapa Initialization failure response:", data);
      return res.status(400).json({ error: data.message || "Chapa service initialization failed." });
    }
  } catch (error: any) {
    console.error("Error in chapa-initialize:", error);
    res.status(500).json({ error: "Failed to connect to Chapa payment server." });
  }
});

// Chapa Payment Gateway: Verify Transaction
app.post("/api/orders/:id/chapa-verify", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    const chapaSecretKey = process.env.CHAPA_SECRET_KEY;
    const isMockMode = !chapaSecretKey || chapaSecretKey.trim() === "";

    if (isMockMode) {
      // In Mock mode, we immediately approve
      const updated = await db
        .update(orders)
        .set({
          paymentConfirmed: true,
          paymentMethod: "Chapa Sandbox",
          statusNote: "Paid via Chapa sandbox simulation.",
        })
        .where(eq(orders.id, id))
        .returning();

      const fullOrder = await db.query.orders.findFirst({
        where: eq(orders.id, id),
        with: { items: true }
      });

      return res.json(fullOrder);
    }

    // Real Chapa verification
    const txRef = order.statusNote || id;

    const response = await fetch(`https://api.chapa.co/v1/transaction/verify/${txRef}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${chapaSecretKey}`,
      }
    });

    const data: any = await response.json();

    if (data.status === "success" && data.data && data.data.status === "success") {
      const updated = await db
        .update(orders)
        .set({
          paymentConfirmed: true,
          paymentMethod: "Chapa",
          statusNote: `Chapa Ref: ${txRef}`,
        })
        .where(eq(orders.id, id))
        .returning();

      const fullOrder = await db.query.orders.findFirst({
        where: eq(orders.id, id),
        with: { items: true }
      });

      return res.json(fullOrder);
    } else {
      console.error("Chapa verification failure response:", data);
      return res.status(400).json({ error: "Chapa transaction verification failed." });
    }
  } catch (error: any) {
    console.error("Error verifying Chapa payment:", error);
    res.status(500).json({ error: "Failed to communicate with Chapa verification endpoint." });
  }
});

// Get users list (Admin only)
app.get("/api/admin/users", requireAuth, requireRole(["admin"]), async (req: AuthRequest, res) => {
  try {
    const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
    res.json(allUsers);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to retrieve user accounts." });
  }
});

// Update user role (Admin only)
app.patch("/api/admin/users/:uid/role", requireAuth, requireRole(["admin"]), async (req: AuthRequest, res) => {
  try {
    const { uid } = req.params;
    const { role } = req.body;

    if (!role || !["customer", "staff", "admin"].includes(role)) {
      return res.status(400).json({ error: "Invalid role specified." });
    }

    const updated = await db
      .update(users)
      .set({ role })
      .where(eq(users.uid, uid))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({ error: "User profile not found." });
    }

    res.json(updated[0]);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to update user privilege level." });
  }
});

// Admin stats endpoint
app.get("/api/admin/stats", requireAuth, requireRole(["admin"]), async (req: AuthRequest, res) => {
  try {
    // 1. Total revenue
    const revResult = await db
      .select({ total: sql<number>`COALESCE(SUM(${orders.total}), 0)` })
      .from(orders)
      .where(eq(orders.paymentConfirmed, true));
    
    const revenue = Number(revResult[0]?.total || 0);

    // 2. Count orders
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders);
    
    const totalOrders = Number(countResult[0]?.count || 0);

    // 3. Count customers
    const custResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, "customer"));
    
    const totalCustomers = Number(custResult[0]?.count || 0);

    // 4. Category breakdown (using subqueries/joins)
    const categoryQuery = await db
      .select({
        name: orderItems.name,
        qty: sql<number>`SUM(${orderItems.quantity})`,
      })
      .from(orderItems)
      .groupBy(orderItems.name)
      .orderBy(sql`SUM(${orderItems.quantity}) DESC`)
      .limit(5);

    res.json({
      revenue,
      totalOrders,
      totalCustomers,
      topItems: categoryQuery.map(row => ({
        name: row.name,
        value: Number(row.qty),
      })),
    });
  } catch (error: any) {
    console.error("Stats aggregation failure:", error);
    res.status(500).json({ error: "Failed to aggregate business statistics." });
  }
});

// ==================== ARTIFICIAL INTELLIGENCE CONCIERGE ====================

app.post("/api/chat", async (req, res) => {
  try {
    const { message, history, cart, orderStatus, menuItems } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const activeMenuItems = menuItems && Array.isArray(menuItems) ? menuItems : MENU_ITEMS;
    const contents: any[] = [];

    const stateContextPrompt = `
CURRENT SYSTEM STATE CONTEXT HINT (DO NOT OUTPUT DIRECTLY UNLESS RELEVANT):
- Current Visual Cart Items: ${cart && cart.length > 0 ? JSON.stringify(cart) : "Empty"}
- Current Order Status: **${orderStatus || "None (No active order placed yet)"}**
- Current Time: ${new Date().toLocaleTimeString()}
`;

    contents.push({
      role: "user",
      parts: [{ text: stateContextPrompt }],
    });

    if (history && Array.isArray(history)) {
      history.slice(-10).forEach((msg: any) => {
        contents.push({
          role: msg.sender === "user" ? "user" : "model",
          parts: [{ text: msg.text }],
        });
      });
    }

    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: getSystemInstruction(activeMenuItems),
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: {
              type: Type.STRING,
              description: "The verbal response to the customer. Maintain the premium Toco Speciality tone and follow constraints such as bolding, tables, and steering back unrelated topics.",
            },
            cartAction: {
              type: Type.OBJECT,
              description: "Action to take on the client-side cart or order status if the customer asked to add/remove/clear/order/pay or requested a status change.",
              properties: {
                type: {
                  type: Type.STRING,
                  enum: ["add", "remove", "clear", "place_order", "pay", "update_status", "none"],
                  description: "Type of action to execute on the client UI.",
                },
                itemName: {
                  type: Type.STRING,
                  description: "Name of the menu item (e.g., 'Toco Signature Gold Latte') if adding or removing.",
                },
                quantity: {
                  type: Type.INTEGER,
                  description: "Quantity to add or remove.",
                },
                customization: {
                  type: Type.STRING,
                  description: "Milk alternative or other options specified by the user.",
                },
                newStatus: {
                  type: Type.STRING,
                  enum: ["Preparing", "Ready for Pickup / Serving"],
                  description: "For status updates, specify the next status to transition to.",
                },
              },
              required: ["type"],
            },
          },
          required: ["message", "cartAction"],
        },
      },
    });

    if (response.text) {
      const result = JSON.parse(response.text.trim());
      res.json(result);
    } else {
      res.status(500).json({ error: "Empty response from AI" });
    }
  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    res.status(500).json({
      message: "I am having a brief connection issue with our kitchen terminal, but I'm ready to help you shortly!",
      cartAction: { type: "none" },
      error: error.message,
    });
  }
});

// Setup Vite Dev Middleware in development, static hosting in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Toco Speciality Dev Server is running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
