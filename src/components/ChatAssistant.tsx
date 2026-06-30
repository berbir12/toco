/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { Message, CartItem, OrderStatus, MenuItem } from "../types";
import { Send, Sparkles, Coffee, RefreshCw, AlertCircle, ShieldCheck } from "lucide-react";

interface ChatAssistantProps {
  messages: Message[];
  onAddMessage: (msg: Message) => void;
  cart: CartItem[];
  orderStatus: OrderStatus;
  orderPlaced: boolean;
  orderPaid: boolean;
  onExecuteAIAction: (action: any) => void;
}

export default function ChatAssistant({
  messages,
  onAddMessage,
  cart,
  orderStatus,
  orderPlaced,
  orderPaid,
  onExecuteAIAction,
}: ChatAssistantProps) {
  const [inputValue, setInputValue] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Premium Quick Suggestions matching Toco Speciality workflows
  const quickReplies = [
    { text: "Show me the Specialty Coffees menu", category: "menu" },
    { text: "Confirm if I'm at Toco Speciality & describe the ambiance", category: "branding" },
    { text: "Suggest a signature dish and coffee pairing", category: "recommend" },
    { text: "Where is my food? Check status", category: "tracking" },
    { text: "Settle my bill", category: "payment" },
  ];

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    setErrorText(null);
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    onAddMessage(userMsg);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: messages.map(m => ({
            sender: m.sender,
            text: m.text
          })),
          cart: cart,
          orderStatus: orderStatus
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      
      // Handle conversational text response
      if (data.message) {
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          sender: "assistant",
          text: data.message,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        onAddMessage(assistantMsg);
      }

      // Handle structured actions back to React state manager
      if (data.cartAction && data.cartAction.type !== "none") {
        onExecuteAIAction(data.cartAction);
      }

    } catch (err: any) {
      console.error("Chat API error:", err);
      setErrorText("I had a temporary connection issue. Please make sure GEMINI_API_KEY is configured.");
      
      // Inject standard helpful guidance
      const fallBackMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        text: "I am experiencing a minor kitchen terminal connection issue. You can still use the beautiful visual panels on the screen to choose your menu items, place your order, and pay!",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      onAddMessage(fallBackMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  // Convert markdown bolding to styled elements
  const formatMessageText = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} className="font-bold text-stone-900 bg-gold-50 px-1 py-0.5 rounded-sm">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-stone-100 shadow-xl flex flex-col h-[650px]" id="chat-assistant">
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-stone-900 text-gold-300 rounded-2xl flex items-center justify-center shadow-md">
            <Coffee className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <h3 className="font-display font-bold text-stone-900 flex items-center gap-1.5 text-sm">
              Toco AI Concierge
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
            </h3>
            <span className="text-xs text-stone-400 font-light font-display">Sophisticated Virtual Host</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-stone-400 hover:text-stone-600 transition-colors bg-stone-50 px-2.5 py-1 rounded-full border border-stone-100 text-[10px] font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-gold-500" />
          Secure AI Gateway
        </div>
      </div>

      {/* Message Logs */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4 scrollbar-thin">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
          >
            <div className={`flex items-end gap-1.5 max-w-[85%] ${msg.sender === "user" ? "flex-row-reverse" : ""}`}>
              {msg.sender === "assistant" && (
                <div className="w-6 h-6 bg-stone-100 text-stone-800 rounded-lg flex items-center justify-center text-[10px] font-serif font-bold shrink-0 border border-stone-200">
                  T
                </div>
              )}
              <div
                className={`p-3.5 rounded-2xl text-xs leading-relaxed font-light ${
                  msg.sender === "user"
                    ? "bg-stone-900 text-stone-100 rounded-tr-none"
                    : "bg-stone-50 text-stone-700 rounded-tl-none border border-stone-100"
                }`}
              >
                {/* Format markdown bold text inside chats */}
                <p className="whitespace-pre-wrap">{formatMessageText(msg.text)}</p>
              </div>
            </div>
            <span className="text-[9px] text-stone-400 font-mono mt-1 mx-8">{msg.timestamp}</span>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-end gap-2 max-w-[85%]">
            <div className="w-6 h-6 bg-stone-100 text-stone-800 rounded-lg flex items-center justify-center text-[10px] font-serif font-bold shrink-0">
              T
            </div>
            <div className="bg-stone-50 border border-stone-100 p-3.5 rounded-2xl rounded-tl-none flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-gold-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-gold-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-gold-500 rounded-full animate-bounce" />
            </div>
          </div>
        )}

        {errorText && (
          <div className="bg-red-50 text-red-800 border border-red-100 p-3 rounded-xl flex items-center gap-2 text-xs">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorText}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Guided Suggestions */}
      <div className="mb-4">
        <span className="text-[10px] font-mono tracking-widest text-stone-400 uppercase font-bold block mb-2">
          Concierge Quick Commands
        </span>
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
          {quickReplies.map((qr, index) => (
            <button
              key={index}
              onClick={() => handleSendMessage(qr.text)}
              className="text-[10px] font-display font-medium bg-stone-50 hover:bg-gold-50 text-stone-600 hover:text-gold-900 border border-stone-200 hover:border-gold-300 rounded-full px-3 py-1.5 transition-all duration-300 cursor-pointer whitespace-nowrap"
            >
              {qr.text}
            </button>
          ))}
        </div>
      </div>

      {/* TextInput Form */}
      <form onSubmit={handleFormSubmit} className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask AI Concierge to customize milk, place order..."
          disabled={isLoading}
          className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-gold-500/50 focus:border-gold-500 disabled:opacity-50 placeholder-stone-400"
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || isLoading}
          className="bg-stone-900 hover:bg-gold-600 text-white hover:text-stone-900 p-3 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:hover:bg-stone-900 disabled:hover:text-white shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
