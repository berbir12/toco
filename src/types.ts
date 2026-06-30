/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: "Speciality Coffees" | "Signature Dishes" | "Desserts";
  description: string;
  optionsLabel?: string;
  options?: string[];
  imageName?: string;
}

export interface CartItem {
  id: string; // unique cart line id
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  customization: {
    milk?: string;
    dietary?: string;
    spice?: string;
    notes?: string;
  };
}

export type OrderStatus = "Received" | "Preparing" | "Ready for Pickup / Serving";

export interface Order {
  id: string;
  items: CartItem[];
  subtotal: number;
  vat: number; // 10%
  serviceCharge: number; // 5%
  total: number;
  status: OrderStatus;
  statusNote: string;
  paymentMethod?: string;
  paymentConfirmed: boolean;
  tableNumber: string;
  createdAt: string;
}

export interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
}
