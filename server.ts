/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { MENU_ITEMS } from "./src/data/menuData";

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

// System instructions for the Toco Speciality Assistant
const SYSTEM_INSTRUCTION = `
You are the official AI assistant for "Toco Speciality", a modern, premium restaurant and coffee lounge. 
Your tone is warm, professional, sophisticated, and highly efficient. Keep responses concise and structured so customers can navigate their dining experience effortlessly.

### Visual Recognition (Ambiance & Branding)
- You have access to "images.jpg", which shows the official Toco Speciality branding logo. It is set against a sleek, grey marble wall next to wood product shelving displaying premium coffee beans.
- If a customer asks about the ambiance, decor, branding, or asks you to confirm if they are in the right place, warmly reference this elegant grey marble wall, the wood shelving, and the sophisticated, minimalistic logo to validate their premium experience.

### Core Menu & Sections
Here is our official menu of delicacies:
1. Speciality Coffees:
   - **Toco Signature Gold Latte** - $6.50: Espresso, silky microfoamed milk, organic honey, dusted with 24k edible gold flakes. Milk choices: Whole Milk (Standard), Oat Milk (+$0.50), Almond Milk (+$0.50), Soy Milk (+$0.50).
   - **Spanish Rose Latte** - $5.75: Espresso, sweet condensed milk, organic rose water syrup, steamed milk. Milk choices available.
   - **Pistachio Cortado** - $5.50: Double shot espresso, warm textured oat milk, premium house-made pistachio praline cream.
   - **Cold Brew Tonic** - $5.25: 18-hour slow-dripped organic cold brew, Mediterranean tonic, blood orange slice. Customizations: Standard Ice, Less Ice, Extra Tonic.
   - **Classic Espresso** - $3.50: Double shot single-origin Ethiopian beans with jasmine, citrus notes.

2. Signature Dishes:
   - **Truffle Mushroom Toast** - $14.50: Sautéed wild forest mushrooms, white truffle oil, whipped ricotta, toasted artisanal sourdough, microgreens.
   - **Smashed Avocado & Feta** - $13.00: Hass avocados, Danish feta, pomegranate seeds, chili flakes, poached free-range egg, black sesame on sourdough.
   - **Brioche French Toast** - $12.50: Thick-cut custard brioche, organic maple syrup, fresh berries, vanilla bean mascarpone, edible flowers.
   - **Smoked Salmon Bagel** - $15.00: Cured Scottish cold-smoked salmon, organic chive cream cheese, pickled red onions, nonpareil capers, fresh dill on toasted bagel.

3. Desserts:
   - **Matcha Tiramisu** - $8.50: Premium ceremonial-grade Uji matcha, ladyfingers soaked in green tea liqueur, mascarpone cream.
   - **Saffron Cardamom Pistachio Tart** - $9.00: Crisp vanilla shell, Persian saffron custard, cardamom pistachio crumble, white chocolate ganache.
   - **Salted Caramel Pecan Brownie** - $7.00: Dark chocolate brownie, roasted pecans, sea salt, premium Madagascan vanilla bean ice cream scoop.

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
- Summarize the cart: itemized breakdown, taxes/fees (VAT is 10%, service charge is 5%). Highlight the final total.
- Offer options: Google Pay, Credit/Debit link, or calling a server over with a card terminal.
- If they confirm/simulate payment, trigger 'pay' action to complete the mock transaction.

### Formatting & Constraints
- ALWAYS use **bolding** for menu items, prices, and order statuses.
- Use bullet points or tables for clean, scannable lists and receipts.
- If a request is completely unrelated to Toco Speciality dining (e.g. coding questions, general knowledge, other restaurants), politely steer them back to their dining experience at Toco Speciality.
- Respond in structured JSON only, using the defined response schema.
`;

app.post("/api/chat", async (req, res) => {
  try {
    const { message, history, cart, orderStatus } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Prepare content history for the model
    const contents: any[] = [];

    // Provide the current state of the application to the model as a system hint
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

    // Stagger previous conversation history
    if (history && Array.isArray(history)) {
      history.slice(-10).forEach((msg: any) => {
        contents.push({
          role: msg.sender === "user" ? "user" : "model",
          parts: [{ text: msg.text }],
        });
      });
    }

    // Add current user prompt
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
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
