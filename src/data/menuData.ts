/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MenuItem } from "../types";

export const MENU_ITEMS: MenuItem[] = [
  // Speciality Coffees
  {
    id: "latte-gold",
    name: "Toco Signature Gold Latte",
    price: 6.50,
    category: "Speciality Coffees",
    description: "Our signature blend espresso, silky microfoamed milk, organic honey, and a delicate dusting of 24k edible gold flakes.",
    optionsLabel: "Milk Choice",
    options: ["Whole Milk (Standard)", "Oat Milk (+$0.50)", "Almond Milk (+$0.50)", "Soy Milk (+$0.50)"]
  },
  {
    id: "rose-latte",
    name: "Spanish Rose Latte",
    price: 5.75,
    category: "Speciality Coffees",
    description: "Rich espresso combined with sweet condensed milk, organic rose water syrup, and textured steamed milk.",
    optionsLabel: "Milk Choice",
    options: ["Whole Milk (Standard)", "Oat Milk (+$0.50)", "Almond Milk (+$0.50)", "Soy Milk (+$0.50)"]
  },
  {
    id: "pistachio-cortado",
    name: "Pistachio Cortado",
    price: 5.50,
    category: "Speciality Coffees",
    description: "Equal parts double espresso and warm textured oat milk, layered with our house-made premium pistachio praline cream.",
    optionsLabel: "Milk Choice",
    options: ["Whole Milk (Standard)", "Oat Milk (+$0.50)", "Almond Milk (+$0.50)", "Soy Milk (+$0.50)"]
  },
  {
    id: "coldbrew-tonic",
    name: "Cold Brew Tonic",
    price: 5.25,
    category: "Speciality Coffees",
    description: "18-hour slow-dripped organic cold brew, premium Mediterranean tonic, served over ice with a dehydrated blood orange wheel.",
    optionsLabel: "Preparation",
    options: ["Standard Ice", "Less Ice", "Extra Tonic"]
  },
  {
    id: "espresso-classic",
    name: "Classic Espresso",
    price: 3.50,
    category: "Speciality Coffees",
    description: "Double shot of single-origin Ethiopian heirloom beans, light-medium roast, with refined notes of jasmine, apricot, and tea-like elegance.",
    optionsLabel: "Serving",
    options: ["Double Shot (Standard)", "Single Shot"]
  },

  // Signature Dishes
  {
    id: "truffle-toast",
    name: "Truffle Mushroom Toast",
    price: 14.50,
    category: "Signature Dishes",
    description: "Sautéed wild forest mushrooms drizzled with white truffle oil, on a bed of whipped ricotta spread over toasted artisanal sourdough, crowned with fresh microgreens.",
    optionsLabel: "Customization",
    options: ["Standard", "Gluten-Free Bread (+$1.50)", "No Ricotta (Vegan Option)"]
  },
  {
    id: "avocado-feta",
    name: "Smashed Avocado & Feta",
    price: 13.00,
    category: "Signature Dishes",
    description: "Freshly smashed Hass avocados, premium Danish feta cheese, pomegranate seeds, chili flakes, a poached free-range egg, and black sesame seeds on multi-grain sourdough.",
    optionsLabel: "Egg Style",
    options: ["Poached (Standard)", "Fried Egg", "No Egg (-$1.00)"]
  },
  {
    id: "brioche-french",
    name: "Brioche French Toast",
    price: 12.50,
    category: "Signature Dishes",
    description: "Thick-cut, buttery artisanal brioche soaked in vanilla custard, served with organic maple syrup, fresh berries, vanilla bean mascarpone whipped cream, and organic edible flowers.",
    optionsLabel: "Customization",
    options: ["Standard", "Extra Maple Syrup", "No Mascarpone"]
  },
  {
    id: "salmon-bagel",
    name: "Smoked Salmon Bagel",
    price: 15.00,
    category: "Signature Dishes",
    description: "Cured Scottish cold-smoked salmon, organic chive cream cheese, pickled red onions, nonpareil capers, and fresh dill fronds on a toasted sesame bagel.",
    optionsLabel: "Bagel Choice",
    options: ["Sesame Bagel", "Everything Bagel", "Gluten-Free Bagel (+$1.00)"]
  },

  // Desserts
  {
    id: "matcha-tiramisu",
    name: "Matcha Tiramisu",
    price: 8.50,
    category: "Desserts",
    description: "Premium ceremonial-grade Uji matcha layered with ladyfingers delicately soaked in green tea liqueur, layered with cloud-like light mascarpone custard.",
    optionsLabel: "Size",
    options: ["Regular Cup", "To-Go Container"]
  },
  {
    id: "saffron-tart",
    name: "Saffron Cardamom Pistachio Tart",
    price: 9.00,
    category: "Desserts",
    description: "Crisp vanilla shortcrust pastry shell filled with Persian saffron custard, topped with cardamom-infused roasted pistachio crumble and white chocolate ganache swirls.",
    optionsLabel: "Customization",
    options: ["Standard", "Warm up (Recommended)"]
  },
  {
    id: "salted-brownie",
    name: "Salted Caramel Pecan Brownie",
    price: 7.00,
    category: "Desserts",
    description: "Rich and gooey dark chocolate brownie baked with roasted pecans, served warm with sea salt crystals and a scoop of premium Madagascan vanilla bean ice cream.",
    optionsLabel: "Ice Cream Scoop",
    options: ["Vanilla Bean Ice Cream", "Double Scoop (+$1.50)", "No Ice cream"]
  }
];
