/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { Message, CartItem, OrderStatus, MenuItem } from "../types";
import { Send, Sparkles, Coffee, AlertCircle, ShieldCheck, CornerDownRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ChatAssistantProps {
  messages: Message[];
  onAddMessage: (msg: Message) => void;
  cart: CartItem[];
  orderStatus: OrderStatus;
  menuItems: MenuItem[];
  onExecuteAIAction: (action: any) => void;
}

export default function ChatAssistant({
  messages,
  onAddMessage,
  cart,
  orderStatus,
  menuItems,
  onExecuteAIAction,
}: ChatAssistantProps) {
  const [inputValue, setInputValue] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const quickReplies = [
    { text: "Recommend a specialty coffee & dessert pairing", category: "recommend" },
    { text: "Add a Signature Gold Latte with oat milk to cart", category: "menu" },
    { text: "Describe the physical café and grey marble counter", category: "branding" },
    { text: "Check active status of my kitchen order", category: "tracking" },
    { text: "How do I settle the bill?", category: "payment" },
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
          orderStatus: orderStatus,
          menuItems: menuItems
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      
      if (data.message) {
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          sender: "assistant",
          text: data.message,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        onAddMessage(assistantMsg);
      }

      if (data.cartAction && data.cartAction.type !== "none") {
        onExecuteAIAction(data.cartAction);
      }

    } catch (err: any) {
      console.error("Chat API error:", err);
      setErrorText("Our secure AI gateway is currently resting. You can still use the elegant digital menu cards below to direct your order.");
      
      const fallBackMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        text: "My apologies. I am currently experiencing a minor terminal connection issue, but our baristas are ready! Please use our visual menu below to select your drinks, place your order, and complete payment.",
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

  const formatMessageText = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} className="font-semibold text-stone-900 bg-gold-50 border border-[#EBE1CD] px-1 rounded-sm text-[11px]">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div className="bg-white rounded-[2rem] p-6 border border-stone-200/60 shadow-[0_12px_40px_rgba(28,24,22,0.03)] flex flex-col h-[520px] relative overflow-hidden" id="chat-assistant">
      
      {/* Decorative luxury pattern on top of chat */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold-600 via-stone-900 to-gold-700" />

      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-stone-950 text-gold-300 rounded-xl flex items-center justify-center shadow-md border border-stone-900">
            <Coffee className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="font-serif font-black text-stone-950 text-sm tracking-wide flex items-center gap-1.5">
              Toco Concierge
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10B981]" />
            </h3>
            <span className="text-[10px] text-stone-400 font-medium font-sans block tracking-wide uppercase">AI Lounge Host & Roaster</span>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-stone-50 border border-stone-150 px-3 py-1.5 rounded-full text-[9px] font-mono text-stone-500 tracking-wider">
          <ShieldCheck className="w-3 h-3 text-gold-600" />
          SECURE REGISTER
        </div>
      </div>

      {/* Message Logs */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4 scrollbar-thin">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
            >
              <div className={`flex items-start gap-2.5 max-w-[88%] ${msg.sender === "user" ? "flex-row-reverse" : ""}`}>
                {msg.sender === "assistant" && (
                  <div className="w-6 h-6 bg-stone-950 text-gold-200 rounded-lg flex items-center justify-center text-[10px] font-serif font-bold shrink-0 border border-stone-900 select-none shadow-sm mt-0.5">
                    T
                  </div>
                )}
                <div
                  className={`p-3.5 rounded-2xl text-xs leading-relaxed font-sans ${
                    msg.sender === "user"
                      ? "bg-stone-950 text-[#F5F2EB] rounded-tr-none font-medium shadow-sm"
                      : "bg-[#FDFBF7] text-stone-850 rounded-tl-none border border-[#E9E4DB] shadow-xs"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{formatMessageText(msg.text)}</p>
                </div>
              </div>
              <span className="text-[8px] text-stone-400 font-mono mt-1 mx-8 tracking-wider">{msg.timestamp}</span>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <div className="flex items-center gap-2 max-w-[80%]">
            <div className="w-6 h-6 bg-stone-950 text-gold-200 rounded-lg flex items-center justify-center text-[10px] font-serif font-bold shrink-0 border border-stone-900 select-none shadow-sm">
              T
            </div>
            <div className="bg-[#FAF8F5] border border-stone-200/60 p-3.5 rounded-2xl rounded-tl-none flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-gold-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-gold-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-gold-600 rounded-full animate-bounce" />
            </div>
          </div>
        )}

        {errorText && (
          <div className="bg-stone-50 text-stone-600 border border-stone-200 p-3 rounded-xl flex items-center gap-2 text-[10px] font-light leading-relaxed">
            <AlertCircle className="w-4 h-4 text-gold-600 shrink-0" />
            <span>{errorText}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Guided Suggestions */}
      <div className="mb-4 pt-2 border-t border-stone-100">
        <span className="text-[9px] font-mono tracking-widest text-stone-400 uppercase font-bold block mb-2">
          Ask our AI Concierge
        </span>
        <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none snap-x">
          {quickReplies.map((qr, index) => (
            <button
              key={index}
              onClick={() => handleSendMessage(qr.text)}
              className="text-[10px] font-sans font-semibold uppercase tracking-wider bg-stone-50 hover:bg-[#FAF6ED] text-stone-500 hover:text-stone-950 border border-stone-200 hover:border-gold-300 rounded-full px-4 py-2 transition-all duration-300 cursor-pointer whitespace-nowrap snap-center shrink-0"
            >
              {qr.text}
            </button>
          ))}
        </div>
      </div>

      {/* TextInput Form */}
      <form onSubmit={handleFormSubmit} className="flex gap-2 relative">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="e.g. Add 2 gold lattes with oat milk..."
          disabled={isLoading}
          className="flex-1 bg-[#FDFBF7] border border-stone-200/80 rounded-xl pl-4 pr-12 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-gold-500 focus:border-gold-500 disabled:opacity-50 placeholder-stone-400 font-light font-sans shadow-xs transition-colors"
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || isLoading}
          className="absolute right-1.5 top-1.5 bottom-1.5 bg-stone-950 hover:bg-gold-500 text-white hover:text-stone-950 px-3 rounded-lg transition-all duration-300 disabled:opacity-50 shrink-0 cursor-pointer flex items-center justify-center border border-stone-900"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
