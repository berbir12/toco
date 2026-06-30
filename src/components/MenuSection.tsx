/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { MenuItem, CartItem } from "../types";
import { MENU_ITEMS } from "../data/menuData";
import { Coffee, Utensils, IceCream, Plus, Sparkles, Check } from "lucide-react";

interface MenuSectionProps {
  onAddToCart: (item: MenuItem, customization: string, quantity: number) => void;
}

export default function MenuSection({ onAddToCart }: MenuSectionProps) {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [specialNotes, setSpecialNotes] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [showSuccessToast, setShowSuccessToast] = useState<string | null>(null);

  const categories = ["All", "Speciality Coffees", "Signature Dishes", "Desserts"];

  const filteredItems = activeCategory === "All"
    ? MENU_ITEMS
    : MENU_ITEMS.filter(item => item.category === activeCategory);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Speciality Coffees":
        return <Coffee className="w-4 h-4" />;
      case "Signature Dishes":
        return <Utensils className="w-4 h-4" />;
      case "Desserts":
        return <IceCream className="w-4 h-4" />;
      default:
        return <Sparkles className="w-4 h-4" />;
    }
  };

  const handleOpenCustomizer = (item: MenuItem) => {
    setSelectedItem(item);
    setSelectedOption(item.options ? item.options[0] : "");
    setSpecialNotes("");
    setQuantity(1);
  };

  const handleConfirmAdd = () => {
    if (!selectedItem) return;
    onAddToCart(selectedItem, selectedOption, quantity);
    
    // Trigger localized success alert
    setShowSuccessToast(`${quantity}x ${selectedItem.name} added!`);
    setTimeout(() => {
      setShowSuccessToast(null);
    }, 3000);

    setSelectedItem(null);
  };

  return (
    <div className="w-full">
      {/* Toast Alert */}
      {showSuccessToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-gold-200 border border-gold-500/30 px-4 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4 text-gold-400" />
          <span className="font-display font-medium text-sm text-stone-100">{showSuccessToast}</span>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 mb-8" id="menu-categories">
        {categories.map((category) => (
          <button
            key={category}
            id={`category-${category.toLowerCase().replace(/\s+/g, '-')}`}
            onClick={() => setActiveCategory(category)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-display text-sm font-medium transition-all duration-300 ${
              activeCategory === category
                ? "bg-stone-900 text-gold-200 shadow-lg border border-gold-500/20"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200 border border-transparent"
            }`}
          >
            {getCategoryIcon(category)}
            {category}
          </button>
        ))}
      </div>

      {/* Menu Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="menu-grid">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            id={`menu-item-${item.id}`}
            className="group relative bg-white rounded-3xl p-6 border border-stone-100 hover:border-gold-300/30 transition-all duration-300 shadow-sm hover:shadow-xl flex flex-col justify-between overflow-hidden"
          >
            {/* Ambient Gold glow behind card */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-radial from-gold-100/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div>
              {/* Category tag */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono tracking-widest text-gold-600 uppercase font-bold bg-gold-50 px-2.5 py-1 rounded-full border border-gold-100">
                  {item.category}
                </span>
                <span className="text-lg font-mono font-bold text-stone-900">
                  ${item.price.toFixed(2)}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-lg font-display font-bold text-stone-900 mb-2 group-hover:text-gold-700 transition-colors duration-300">
                {item.name}
              </h3>

              {/* Description */}
              <p className="text-stone-500 text-sm leading-relaxed mb-6 font-light">
                {item.description}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-stone-50">
              <span className="text-xs text-stone-400 font-display">
                {item.options ? `${item.options.length} options` : "Standard preparation"}
              </span>
              <button
                id={`add-btn-${item.id}`}
                onClick={() => handleOpenCustomizer(item)}
                className="flex items-center gap-1 bg-stone-900 text-white hover:bg-gold-600 hover:text-stone-900 px-4 py-2 rounded-xl text-xs font-display font-semibold shadow-md transition-all duration-300"
              >
                <Plus className="w-3.5 h-3.5" />
                Customize & Add
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Customizer Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-stone-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 bg-stone-900 text-white relative">
              <span className="text-[10px] font-mono tracking-widest text-gold-300 uppercase font-bold">
                {selectedItem.category}
              </span>
              <h3 className="text-2xl font-serif font-semibold mt-1 text-gold-100">
                {selectedItem.name}
              </h3>
              <p className="text-stone-300 text-sm mt-2 font-light">
                {selectedItem.description}
              </p>
              <div className="absolute right-6 top-6 text-xl font-mono font-bold text-gold-300">
                ${selectedItem.price.toFixed(2)}
              </div>
            </div>

            {/* Customizer Body */}
            <div className="p-6 space-y-6">
              {/* Options */}
              {selectedItem.options && (
                <div>
                  <label className="block text-xs font-display font-semibold tracking-wider text-stone-500 uppercase mb-3">
                    {selectedItem.optionsLabel || "Options"}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedItem.options.map((option) => (
                      <button
                        key={option}
                        onClick={() => setSelectedOption(option)}
                        className={`px-4 py-3 rounded-xl border text-left text-xs font-display transition-all duration-300 ${
                          selectedOption === option
                            ? "bg-gold-50 border-gold-400 text-gold-900 font-semibold"
                            : "bg-stone-50 border-stone-100 text-stone-600 hover:bg-stone-100"
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
                <label className="block text-xs font-display font-semibold tracking-wider text-stone-500 uppercase mb-3">
                  Quantity
                </label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center border border-stone-200 rounded-xl overflow-hidden bg-stone-50">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-4 py-2 text-stone-500 hover:bg-stone-100 transition-colors"
                    >
                      -
                    </button>
                    <span className="px-4 font-mono font-bold text-stone-800 w-12 text-center">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="px-4 py-2 text-stone-500 hover:bg-stone-100 transition-colors"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-sm font-mono text-stone-500">
                    Total: <strong className="text-stone-800">${(selectedItem.price * quantity).toFixed(2)}</strong>
                  </span>
                </div>
              </div>

              {/* Special Instructions */}
              <div>
                <label className="block text-xs font-display font-semibold tracking-wider text-stone-500 uppercase mb-3">
                  Special Notes / Diet Restrictions
                </label>
                <textarea
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  placeholder="e.g. Extra hot, no whipped cream, allergic to walnuts..."
                  className="w-full bg-stone-50 border border-stone-150 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 h-20 resize-none placeholder-stone-400 font-light"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-6 bg-stone-50 border-t border-stone-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-5 py-2.5 rounded-xl text-stone-500 hover:bg-stone-200/50 text-xs font-display font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAdd}
                className="px-6 py-2.5 rounded-xl bg-stone-900 text-gold-200 hover:bg-stone-800 text-xs font-display font-bold shadow-md transition-all duration-300"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
