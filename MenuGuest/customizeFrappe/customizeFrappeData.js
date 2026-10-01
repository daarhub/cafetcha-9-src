// =====================================================================
//  CUSTOMIZE FRAPPE — CONFIGURATION (ADMIN-FRIENDLY)
//  =====================================================================
//  Every choice a guest can make for the 3D frappe customizer lives here.
//  The wizard, the price calculation, AND the 3D scene all read from
//  this file — so adding / editing / deleting an option only means
//  editing this array (or, later, having your admin dashboard write it).
//
//  OPTION FIELDS:
//    id     – unique key (never change once used, safe to reorder)
//    name   – shown to the customer
//    price  – in ₱, always added to the total (0 = free choice)
//    image  – preview image inside /public/images/customize-frappe
//    scene  – extra info the 3D scene uses to draw the choice
//             (colors, cup scaling, topping type)
//
//  STEP FIELDS:
//    key      – unique step key ("size", "flavor", ...)
//    step     – step number in the wizard
//    title    – heading shown above the choices
//    subtitle – optional extra text under the heading
//    type     – "single" (pick one) or "multi" (pick several)
//    hasImage – whether the step shows image cards (false = pill buttons)
//    options  – the choices described above
// =====================================================================

export const CUSTOMIZE_FRAPPE = {
  steps: [
    {
      key: "size",
      step: 1,
      title: "Choose your Cup size",
      subtitle:
        "Pick how much frappe you're craving — Regular 12oz, Grande 16oz, or Large 22oz.",
      type: "single",
      hasImage: false,
      options: [
        { id: "regular", name: "Regular - 12oz", price: 0, scene: { cupScale: 0.83 } },
        { id: "grande", name: "Grande - 16oz", price: 25, scene: { cupScale: 0.9 } },
        { id: "large", name: "Large - 22oz", price: 50, scene: { cupScale: 1.0 } },
      ],
    },
    {
      key: "flavor",
      step: 2,
      title: "Choose your frappe",
      subtitle:
        "Pick the base of your drink — every flavor is blended thick, creamy and cold.",
      type: "single",
      hasImage: true,
      options: [
        {
          id: "chocolate",
          name: "Chocolate",
          price: 80,
          image: "/images/customize-frappe/CHOOSE-YOUR-FRAPPE/chocolate-liquid.png",
          scene: { color: "#5b3a21", cream: "#8a5a34" },
        },
        {
          id: "cookies-and-cream",
          name: "Cookies and Cream",
          price: 95,
          image: "/images/customize-frappe/CHOOSE-YOUR-FRAPPE/cookies-and-cream-liquid.png",
          scene: { color: "#d8cbc0", cream: "#efe6dd", flecks: true },
        },
        {
          id: "caramel-vanilla",
          name: "Caramel Vanilla",
          price: 95,
          image: "/images/customize-frappe/CHOOSE-YOUR-FRAPPE/caramel-vanila-liquid.png",
          scene: { color: "#c98f4e", cream: "#e5bd83" },
        },
        {
          id: "blueberry",
          name: "Blueberry",
          price: 100,
          image: "/images/customize-frappe/CHOOSE-YOUR-FRAPPE/blueberry-liquid.png",
          scene: { color: "#6b5fb8", cream: "#9a90d6" },
        },
        {
          id: "pistachio",
          name: "Pistachio",
          price: 100,
          image: "/images/customize-frappe/CHOOSE-YOUR-FRAPPE/pistachio-liquid.png",
          scene: { color: "#a8c68c", cream: "#c6dbb0" },
        },
        {
          id: "raspberry",
          name: "Raspberry",
          price: 100,
          image: "/images/customize-frappe/CHOOSE-YOUR-FRAPPE/raspberry-liquid.png",
          scene: { color: "#d24f63", cream: "#e88a99" },
        },
        {
          id: "strawberry",
          name: "Strawberry",
          price: 105,
          image: "/images/customize-frappe/CHOOSE-YOUR-FRAPPE/strawberry-liquid.png",
          scene: { color: "#f08ca6", cream: "#f7b7c8" },
        },
        {
          id: "vanilla",
          name: "Vanilla",
          price: 110,
          image: "/images/customize-frappe/CHOOSE-YOUR-FRAPPE/vanilla-liquid.png",
          scene: { color: "#f4e6c8", cream: "#fbf1da" },
        },
      ],
    },
  {
      key: "toppings",
      step: 3,
      title: "Choose your toppings",
      subtitle: "You can pick one or more toppings.",
      type: "multi",
      hasImage: true,
      options: [
        {
          id: "whipped-cream",
          name: "Whipped Cream",
          price: 20,
          image: "/images/customize-frappe/TOPPINGS/whipped-cream.png",
          scene: { type: "cream", color: "#ffffff" },
        },
        {
          id: "oreo-crumbs",
          name: "Oreo Crumbs",
          price: 15,
          image: "/images/customize-frappe/TOPPINGS/oreo-crumbs.png",
          scene: { type: "crumbs", color: "#2f2b28", crumb: "oreo" },
        },
        {
          id: "chocolate-chips",
          name: "Chocolate Chips",
          price: 15,
          image: "/images/customize-frappe/TOPPINGS/chocolate-chips.png",
          scene: { type: "chips", color: "#3a2415" },
        },
        {
          id: "cookie-crumbs",
          name: "Cookie Crumbs",
          price: 15,
          image: "/images/customize-frappe/TOPPINGS/cookie-crumbs.png",
          scene: { type: "crumbs", color: "#8a6243", crumb: "cookie" },
        },
        {
          id: "graham-crumbs",
          name: "Graham Crumbs",
          price: 15,
          image: "/images/customize-frappe/TOPPINGS/graham-crumbs.png",
          scene: { type: "graham", color: "#c89b5f", crumb: "graham" },
        },
        {
          id: "chocolate-shavings",
          name: "Chocolate Shavings",
          price: 15,
          image: "/images/customize-frappe/TOPPINGS/chocolate-shavings.png",
          scene: { type: "shavings", color: "#4a2e1a" },
        },
        {
          id: "marshmallows",
          name: "Marshmallows",
          price: 20,
          image: "/images/customize-frappe/TOPPINGS/marshmallows.png",
          scene: { type: "marshmallow", color: "#fffdf7" },
        },
        {
          id: "crushed-nuts",
          name: "Crushed Nuts",
          price: 20,
          image: "/images/customize-frappe/TOPPINGS/crushed-nuts.png",
          scene: { type: "nuts", color: "#d6a05e" },
        },
      ],
    },
  {
      key: "drizzles",
      step: 4,
      title: "Choose your drizzles",
      subtitle: "You can pick one or more drizzles.",
      type: "multi",
      hasImage: true,
      options: [
        {
          id: "chocolate-drizzle",
          name: "Chocolate Drizzle",
          price: 15,
          image: "/images/customize-frappe/DRIZZLES/chocolate-drizzle.png",
          scene: { color: "#4a2a17" },
        },
        {
          id: "classic-caramel",
          name: "Classic Caramel Drizzle",
          price: 15,
          image: "/images/customize-frappe/DRIZZLES/classic-caramel-drizzle.png",
          scene: { color: "#c0812f" },
        },
        {
          id: "strawberry-drizzle",
          name: "Strawberry Drizzle",
          price: 15,
          image: "/images/customize-frappe/DRIZZLES/strawberry-drizzle.png",
          scene: { color: "#e35d7f" },
        },
        {
          id: "white-chocolate",
          name: "White Chocolate Drizzle",
          price: 15,
          image: "/images/customize-frappe/DRIZZLES/white-chocolate-drizzle.png",
          scene: { color: "#f3e9d2" },
        },
        {
          id: "pistachio-drizzle",
          name: "Pistachio Drizzle",
          price: 15,
          image: "/images/customize-frappe/DRIZZLES/pistachio-drizzle.png",
          scene: { color: "#93bb70" },
        },
        {
          id: "blueberry-drizzle",
          name: "Blueberry Drizzle",
          price: 15,
          image: "/images/customize-frappe/DRIZZLES/blueberry-drizzle.png",
          scene: { color: "#6b5fb8" },
        },
        {
          id: "raspberry-drizzle",
          name: "Raspberry Drizzle",
          price: 15,
          image: "/images/customize-frappe/DRIZZLES/raspberry-drizzle.png",
          scene: { color: "#cf3f5e" },
        },
        {
          id: "salted-caramel",
          name: "Salted Caramel Drizzle",
          price: 15,
          image: "/images/customize-frappe/DRIZZLES/salted-caramel-drizzle.png",
          scene: { color: "#a9742c" },
        },
      ],
    },
  {
      key: "addOns",
      step: 5,
      title: "Add-ons",
      subtitle: "Extra goodies on top — you can pick several.",
      type: "multi",
      hasImage: true,
      options: [
        {
          id: "vanilla-ice-cream",
          name: "Vanilla Ice Cream",
          price: 35,
          image: "/images/customize-frappe/ADD-ONS/vanilla-ice-cream-addons.png",
          scene: { type: "scoop", color: "#fff3d6" },
        },
        {
          id: "chocolate-ice-cream",
          name: "Chocolate Ice Cream",
          price: 35,
          image: "/images/customize-frappe/ADD-ONS/chocolate-ice-cream-addons.png",
          scene: { type: "scoop", color: "#7a4a2a" },
        },
        {
          id: "strawberry-ice-cream",
          name: "Strawberry Ice Cream",
          price: 35,
          image: "/images/customize-frappe/ADD-ONS/strawberry-ice-cream-addons.png",
          scene: { type: "scoop", color: "#f7a0bb" },
        },
        {
          id: "brownie-bits",
          name: "Brownie Bits",
          price: 25,
          image: "/images/customize-frappe/ADD-ONS/brownie-bits-addons.png",
          scene: { type: "brownie", color: "#3b2117" },
        },
        {
          id: "cheesecake-bits",
          name: "Cheesecake Bits",
          price: 25,
          image: "/images/customize-frappe/ADD-ONS/cheesecake-bits-addons.png",
          scene: { type: "cheesecake", color: "#f6ecd9" },
        },
        {
          id: "oreo-cookies",
          name: "Oreo Cookies",
          price: 30,
          image: "/images/customize-frappe/ADD-ONS/oreo-cookies-addons.png",
          scene: { type: "oreo", color: "#2f2b28" },
        },
      ],
    },
    {
      key: "sugar",
      step: 6,
      title: "Sugar Levels",
      subtitle: "Sugar levels for all — the price stays the same.",
      type: "single",
      hasImage: false,
      options: [
        { id: "no-sugar", name: "0% - No Sugar", price: 0 },
        { id: "less-sweet", name: "25% - Less Sweet", price: 0 },
        { id: "half-sweet", name: "50% - Half Sweet", price: 0 },
        { id: "slightly-sweet", name: "75% - Slightly Sweet", price: 0 },
        { id: "regular-sweet", name: "100% - Regular Sweet", price: 0 },
      ],
    },
  ],
};

// ---------------------------------------------------------------------
//  HELPERS — the wizard and the 3D scene use these so everything stays
//  in sync even when an admin edits the options above.
// ---------------------------------------------------------------------
export const getStep = (stepKey) =>
  CUSTOMIZE_FRAPPE.steps.find((step) => step.key === stepKey);

export const getOption = (stepKey, optionId) =>
  getStep(stepKey)?.options.find((option) => option.id === optionId);

export const getDefaultId = (stepKey) => getStep(stepKey)?.options[0]?.id;

export const getTotalPrice = (selections) => {
  let total = 0;
  CUSTOMIZE_FRAPPE.steps.forEach((step) => {
    const selected = step.type === "multi" ? selections[step.key] || [] : [selections[step.key] || getDefaultId(step.key)];
    selected.forEach((id) => {
      const option = getOption(step.key, id);
      if (option) total += option.price;
    });
  });
  return total;
};

// Converts the wizard selections into a clean object the 3D scene reads.
export const buildFrappeConfig = (selections) => ({
  size: selections.size || getDefaultId("size"),
  flavor: selections.flavor || getDefaultId("flavor"),
  toppings: selections.toppings || [],
  drizzles: selections.drizzles || [],
  addOns: selections.addOns || [],
  sugar: selections.sugar || getDefaultId("sugar"),
});

export const getFrappeBasePrice = () =>
  getOption("flavor", getDefaultId("flavor")).price;