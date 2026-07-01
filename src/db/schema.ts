/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { relations } from "drizzle-orm";
import { pgTable, serial, text, integer, boolean, real, timestamp, jsonb } from "drizzle-orm/pg-core";

// Users table linked to Firebase Auth UID
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(), // Firebase Auth UID
  email: text("email").notNull(),
  role: text("role").notNull().default("customer"), // 'customer' | 'staff' | 'admin'
  createdAt: timestamp("created_at").defaultNow(),
});

// Orders table
export const orders = pgTable("orders", {
  id: text("id").primaryKey(), // Client generated or server generated ID
  userId: text("user_id").references(() => users.uid, { onDelete: "set null" }),
  subtotal: real("subtotal").notNull(),
  vat: real("vat").notNull(),
  serviceCharge: real("service_charge").notNull(),
  total: real("total").notNull(),
  status: text("status").notNull(), // Received, Preparing, Ready for Pickup / Serving, Served & Completed
  statusNote: text("status_note").notNull().default(""),
  paymentMethod: text("payment_method"),
  paymentConfirmed: boolean("payment_confirmed").notNull().default(false),
  tableNumber: text("table_number").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

// Order items mapping
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  menuItemId: text("menu_item_id").notNull(),
  name: text("name").notNull(),
  price: real("price").notNull(),
  quantity: integer("quantity").notNull(),
  customization: jsonb("customization").$type<{
    milk?: string;
    dietary?: string;
    spice?: string;
    notes?: string;
  }>(),
});

// Relationships
export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.uid],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
}));
