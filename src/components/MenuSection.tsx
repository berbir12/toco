/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { MenuItem } from "../types";
import { Coffee, Utensils, IceCream, Plus, Sparkles, Info, Star } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface MenuSectionProps {
  menuItems: MenuItem[];
  onAddToCart: (item: MenuItem, customization: string, quantity: number) => void;
}

export default function MenuSection({ menuItems, onAddToCart }: MenuSectionProps) {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [specialNotes, setSpecialNotes] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [showSuccessToast, setShowSuccessToast] = useState<string | null>(null);

  const categories = ["All", "Speciality Coffees", "Signature Dishes", "Desserts"];

  const filteredItems = activeCategory === "All"
    ? menuItems
    : menuItems.filter(item => item.category === activeCategory);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Speciality Coffees":
        return <Coffee className="w-3.5 h-3.5" />;
      case "Signature Dishes":
        return <Utensils className="w-3.5 h-3.5" />;
      case "Desserts":
        return <IceCream className="w-3.5 h-3.5" />;
      default:
        return <Sparkles className="w-3.5 h-3.5" />;
    }
  };

  const handleOpenCustomizer = (item: MenuItem) => {
    setSelectedItem(item);
    setSelectedOption(item.options && item.options.length > 0 ? item.options[0] : "Standard Choice");
    setSpecialNotes("");
    setQuantity(1);
  };

  const handleConfirmAdd = () => {
    if (!selectedItem) return;
    onAddToCart(selectedItem, selectedOption, quantity);
    
    setShowSuccessToast(`${quantity}x ${selectedItem.name} added to cart`);
    setTimeout(() => {
      setShowSuccessToast(null);
    }, 2500);

    setSelectedItem(null);
  };

  return (
    <div className="w-full">
      {/* Toast Alert */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 left-6 z-50 bg-stone-950 text-gold-200 border border-gold-600/40 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3.5"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-gold-400 animate-ping" />
            <span className="font-sans font-bold text-xs tracking-wider text-[#FAF5EC]">{showSuccessToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2.5 mb-8" id="menu-categories">
        {categories.map((category) => (
          <button
            key={category}
            id={`category-${category.toLowerCase().replace(/\s+/g, '-')}`}
            onClick={() => setActiveCategory(category)}
            className={`flex items-center gap-2.5 px-6 py-3.5 rounded-full font-sans text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 cursor-pointer border ${
              activeCategory === category
                ? "bg-stone-950 text-gold-200 border-stone-950 shadow-md scale-102"
                : "bg-white text-stone-500 border-stone-200 hover:text-stone-950 hover:bg-[#FDFBF7]"
            }`}
          >
            {getCategoryIcon(category)}
            <span>{category}</span>
          </button>
        ))}
      </div>

      {/* Gourmet Paper Menu Container */}
      <div className="bg-white rounded-[2.5rem] p-8 md:p-12 border border-[#E9E4DB] shadow-[0_12px_50px_rgba(233,228,219,0.25)] relative overflow-hidden">
        
        {/* Fine border outline */}
        <div className="absolute inset-4 rounded-[1.8rem] border border-gold-700/5 pointer-events-none" />

        {/* Vintage Header */}
        <div className="text-center mb-12 relative">
          <span className="text-[10px] font-mono tracking-[0.35em] text-gold-700 uppercase font-black block mb-2">
            • TOCO SPECIALITY CARD •
          </span>
          <span className="text-[11px] font-serif italic text-stone-400 font-medium block">
            Crafted against custom grey marble and warm cherry-wood shelving
          </span>
          <div className="h-[1px] w-14 bg-gold-700/20 mx-auto mt-4" />
        </div>

        {/* Dynamic menu lines */}
        <div className="space-y-10 relative" id="menu-grid">
          {filteredItems.length === 0 ? (
            <div className="text-center py-20">
              <Info className="w-8 h-8 text-stone-300 mx-auto mb-3" />
              <p className="text-stone-500 text-xs font-sans font-black uppercase tracking-widest">No Selection Available</p>
              <p className="text-stone-400 text-[11px] mt-1 font-light">Check other sections or customized lists.</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                id={`menu-item-${item.id}`}
                className="group relative flex flex-col md:flex-row md:items-start justify-between gap-3 pb-8 border-b border-[#E9E4DB]/50 last:border-0 last:pb-0"
              >
                {/* Left block */}
                <div className="flex-1">
                  <div className="flex items-baseline justify-between gap-2.5">
                    
                    {/* Item Name */}
                    <h3 className="text-xl font-serif font-black text-stone-950 group-hover:text-gold-700 transition-colors duration-300">
                      {item.name}
                    </h3>
                    
                    {/* Elegant Leader Lines */}
                    <div className="hidden md:block flex-1 border-b border-dotted border-stone-300/80 mx-2.5 h-1" />

                    {/* Price with classic Monospace styling */}
                    <span className="text-sm font-mono font-bold text-stone-950 bg-stone-50 px-3 py-1 rounded border border-stone-200 shadow-2xs">
                      ${Number(item.price).toFixed(2)}
                    </span>
                  </div>

                  {/* Description of gourmet ingredients */}
                  <p className="text-stone-500 text-[11px] leading-relaxed mt-2.5 font-light max-w-2xl font-sans">
                    {item.description}
                  </p>

                  {/* Subtext info indicators */}
                  <div className="flex items-center gap-3 mt-4">
                    <span className="text-[9px] font-sans font-bold uppercase tracking-widest text-gold-700 bg-gold-50 border border-gold-100/40 px-2 py-0.5 rounded-sm">
                      {item.category}
                    </span>
                    {item.options && item.options.length > 0 && (
                      <span className="text-[9px] text-stone-400 font-medium tracking-wide font-sans flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 text-gold-600 fill-gold-600" />
                        {item.options.length} custom choices
                      </span>
                    )}
                  </div>
                </div>

                {/* Right block: Action button */}
                <div className="flex items-center justify-end shrink-0 mt-3 md:mt-0">
                  <button
                    id={`add-btn-${item.id}`}
                    onClick={() => handleOpenCustomizer(item)}
                    className="flex items-center gap-1.5 bg-stone-950 text-gold-200 hover:bg-gold-700 hover:text-stone-950 px-5 py-2.5 rounded-xl text-[10px] font-sans font-black uppercase tracking-[0.15em] shadow-md transition-all duration-300 cursor-pointer border border-stone-900"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    SELECT & ADJUST
                  </button>
                </div>

              </div>
            ))
          )}
        </div>

      </div>

      {/* High-End Customizer Dialog Modal */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden border border-[#E9E4DB]"
            >
              {/* Header */}
              <div className="p-8 bg-stone-950 text-white relative">
                <span className="text-[9px] font-mono tracking-[0.25em] text-gold-400 uppercase font-black">
                  {selectedItem.category}
                </span>
                <h3 className="text-3xl font-serif font-black mt-2 text-gold-100">
                  {selectedItem.name}
                </h3>
                <p className="text-stone-400 text-xs mt-3 font-light leading-relaxed font-sans">
                  {selectedItem.description}
                </p>
                <div className="absolute right-8 top-8 text-base font-mono font-bold text-gold-200 bg-stone-900 px-3.5 py-1 rounded-xl border border-stone-850">
                  ${Number(selectedItem.price).toFixed(2)}
                </div>
              </div>

              {/* Customizer Body */}
              <div className="p-8 space-y-6">
                
                {/* Options Selection */}
                {selectedItem.options && selectedItem.options.length > 0 && (
                  <div>
                    <label className="block text-[10px] font-mono font-bold tracking-[0.2em] text-stone-400 uppercase mb-3">
                      {selectedItem.optionsLabel || "Choose Customization"}
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {selectedItem.options.map((option) => (
                        <button
                          key={option}
                          onClick={() => setSelectedOption(option)}
                          className={`px-4 py-3 rounded-2xl border text-left text-xs font-sans font-bold tracking-wide transition-all duration-300 cursor-pointer ${
                            selectedOption === option
                              ? "bg-gold-50 border-gold-600/50 text-gold-900 shadow-xs scale-102"
                              : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantity */}
                <div>
                  <label className="block text-[10px] font-mono font-bold tracking-[0.2em] text-stone-400 uppercase mb-3">
                    Specify Quantity
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center border border-stone-200 rounded-2xl overflow-hidden bg-stone-50 p-1">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-8 h-8 text-stone-500 hover:bg-stone-200/50 rounded-lg transition-colors font-bold text-sm cursor-pointer flex items-center justify-center"
                      >
                        -
                      </button>
                      <span className="px-4 font-mono font-bold text-stone-900 w-10 text-center">
                        {quantity}
                      </span>
                      <button
                        onClick={() => setQuantity(quantity + 1)}
                        className="w-8 h-8 text-stone-500 hover:bg-stone-200/50 rounded-lg transition-colors font-bold text-sm cursor-pointer flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-xs font-sans text-stone-500">
                      Total: <strong className="text-stone-950 font-bold font-mono">${(selectedItem.price * quantity).toFixed(2)}</strong>
                    </span>
                  </div>
                </div>

                {/* Special instructions */}
                <div>
                  <label className="block text-[10px] font-mono font-bold tracking-[0.2em] text-stone-400 uppercase mb-3">
                    Special Notes & Dietary Requests
                  </label>
                  <textarea
                    value={specialNotes}
                    onChange={(e) => setSpecialNotes(e.target.value)}
                    placeholder="e.g. Oat milk, extra hot, soy alternatives..."
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-4 text-xs focus:outline-none focus:ring-1 focus:ring-gold-500/20 focus:border-gold-500 h-20 resize-none placeholder-stone-400 font-light font-sans"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="px-8 py-6 bg-stone-50 border-t border-stone-150 flex items-center justify-end gap-3.5">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="px-5 py-3 rounded-full text-stone-500 hover:bg-stone-200/50 text-xs font-sans font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAdd}
                  className="px-6 py-3.5 rounded-xl bg-stone-950 text-gold-200 hover:bg-stone-900 text-xs font-sans font-bold uppercase tracking-widest shadow-md transition-all duration-300 cursor-pointer border border-stone-900"
                >
                  Add to Tab
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
