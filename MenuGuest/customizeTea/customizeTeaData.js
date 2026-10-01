// =====================================================================
//  CUSTOMIZE TEA — CONFIGURATION (ADMIN-FRIENDLY)
//  Every choice a guest can make for the 3D tea customizer lives here.

//  OPTION FIELDS:
//    id     – unique key (never change once used)
//    name   – shown to the customer
//    price  – in ₱, always added to the total (0 = free choice)
//    image  – preview image inside /public/images/CUSTOMIZE-TEA
//    scene  – extra info the 3D scene uses to draw the choice
//  STEP FIELDS:
//    key      – unique step key ("size", "tea", ...)
//    step     – step number in the wizard
//    title    – heading shown above the choices
//    type     – "single" (pick one) or "multi" (pick several)
//    hasImage – whether the step shows image cards (false = pill buttons)
//    options  – the choices described above
// =====================================================================

export const CUSTOMIZE_TEA = {
  steps: [
    {
      key: "size",
      step:  1,
      title: "Choose your cup size",
      subtitle:
        "Pick how much tea you're craving — Regular 12oz, Grande 16oz, or Large 22oz.",
      type: "single",
      hasImage: false,
      options: [
        { id: "regular", name: "Regular - 12oz", price: 0, scene: { cupScale: 0.83 } },
        { id: "grande", name: "Grande - 16oz", price: 25, scene: { cupScale: 0.9 } },
        { id: "large", name: "Large - 22oz", price: 50, scene: { cupScale: 1 } },
      ],
    },
    {
      key: "tea",
      step:  2,
      title: "Choose your Tea-Based drink",
      subtitle:
        "Pick the tea base of your drink — every option is served fresh and cold.",
      type: "single",
      hasImage: true,
      options: [
        {
          id: "peach-green-tea",
          name: "Peach Green Tea",
          price:  99,
          image: "/images/CUSTOMIZE-TEA/CHOOSE-YOUR-TEA/peach-green-tea-liquid.png",
          scene: { bottom: "#b98a2f", top: "#e9c96a" },
        },
        {
          id: "lychee-green-tea",
          name: "Lychee Green Tea",
          price:  99,
          image: "/images/CUSTOMIZE-TEA/CHOOSE-YOUR-TEA/lychee-green-tea-liquid.png",
          scene: { bottom: "#7a531f", top: "#c49a4d" },
        },
        {
          id: "honey-lemon",
          name: "Honey Lemon",
          price:  99,
          image: "/images/CUSTOMIZE-TEA/CHOOSE-YOUR-TEA/honey-lemon-liquid.png",
          scene: { bottom: "#f2bf52", top: "#fbe49d" },
        },
        {
          id: "matcha",
          name: "Matcha",
          price:  125,
          image: "/images/CUSTOMIZE-TEA/CHOOSE-YOUR-TEA/matcha-liquid.png",
          scene: { texture: "frappe", bottom: "#43850e", top: "#79b426" },
        },
        {
          id: "strawberry-matcha",
          name: "Strawberry Matcha",
          price:  135,
          image: "/images/CUSTOMIZE-TEA/CHOOSE-YOUR-TEA/strawberry-matcha-liquid.png",
          scene: {
            texture: "frappe",
            bottom: "#e30f39",
            mid: "#fffdf8",
            top: "#3f9410",
            stops: [0.4, 0.65],
          },
        },
        {
          id: "wintermelon",
          name: "Wintermelon",
          price:  99,
          image: "/images/CUSTOMIZE-TEA/CHOOSE-YOUR-TEA/wintermelon-liquid.png",
          scene: { texture: "frappe", bottom: "#a2671d", top: "#d19a45" },
        },
        {
          id: "creamy-milk",
          name: "Creamy Milk",
          price:  99,
          image: "/images/CUSTOMIZE-TEA/CHOOSE-YOUR-TEA/creamy-milk-liquid.png",
          scene: { texture: "frappe", bottom: "#e2bd82", top: "#f3dfba" },
        },
      ],
    },
{
      key: "boba",
      step: 3,
      title: "Choose your Popping Boba",
      subtitle:
        "Juicy popping boba that burst with flavor — pick one or more.",
      type: "multi",
      hasImage: true,
      options: [
        {
          id: "strawberry-boba",
          name: "Strawberry",
          price: 25,
          image: "/images/CUSTOMIZE-TEA/POPPING BOBA/strawberry-popping-boba.png",
          scene: { type: "boba", color: "#ee5d92" },
        },
        {
          id: "lychee-boba",
          name: "Lychee",
          price: 25,
          image: "/images/CUSTOMIZE-TEA/POPPING BOBA/lychee-popping-boba.png",
          scene: { type: "boba", color: "#f6ecf1" },
        },
        {
          id: "peach-boba",
          name: "Peach",
          price:  25,
          image: "/images/CUSTOMIZE-TEA/POPPING BOBA/peach-popping-boba.png",
          scene: { type: "boba", color: "#f2a35f" },
        },
        {
          id: "chocolate-boba",
          name: "Chocolate",
          price:  25,
          image: "/images/CUSTOMIZE-TEA/POPPING BOBA/chocolate-popping-boba.png",
          scene: { type: "boba", color: "#5b4038" },
        },
      ],
    },
    {
      key: "addOns",
      step: 4,
      title: "Add-ons",
      subtitle:
        "Extra bites and flavors — pick one or more. Honey is drizzled on top of your drink.",
      type: "multi",
      hasImage: true,
      options: [
        {
          id: "tapioca-pearls",
          name: "Tapioca Pearls",
          price: 25,
          image: "/images/CUSTOMIZE-TEA/ADD-ONS/tapioca-pearls.png",
          scene: { type: "tapioca", color: "#4a2f21" },
        },
        {
          id: "nata-de-coco",
          name: "Nata de Coco",
          price: 20,
          image: "/images/CUSTOMIZE-TEA/ADD-ONS/nata-de-coco.png",
          scene: { type: "nata", color: "#f6f0e6" },
        },
        {
          id: "honey",
          name: "Honey",
          price: 25,
          image: "/images/CUSTOMIZE-TEA/ADD-ONS/honey.png",
          scene: { type: "honey", color: "#f2a63d" },
        },
        {
          id: "coffee-jelly",
          name: "Coffee Jelly",
          price: 20,
          image: "/images/CUSTOMIZE-TEA/ADD-ONS/coffee-jelly.png",
          scene: { type: "jelly", color: "#6b4f42" },
        },
      ],
    },
    {
      key: "sugar",
      step:  5,
      title: "Sugar Levels",
      subtitle: "Sugar levels for all — the price stays the same.",
      type: "single",
      hasImage: false,
      options: [
        { id: "no-sugar", name: "0% - No Sugar", price: 0 },
        { id: "less-sweet", name: "25% - Less Sweet", price:  0 },
        { id: "half-sweet", name: "50% - Half Sweet", price:  0 },
        { id: "slightly-sweet", name: "75% - Slightly Sweet", price:  0 },
        { id: "regular-sweet", name: "100% - Regular Sweet", price:  0 },
      ],
    },
  ],
};

// ---------------------------------------------------------------------
//  HELPERS — the wizard and the 3D scene use these so everything stays
//  in sync even when an admin edits the options above.


export const getStep = (stepKey) =>
  CUSTOMIZE_TEA.steps.find((step) => step.key === stepKey);

export const getOption = (stepKey, optionId) =>
  getStep(stepKey)?.options.find((option) => option.id === optionId);

export const getDefaultId = (stepKey) => getStep(stepKey)?.options[0]?.id;

export const getTotalPrice = (selections) => {
  let total = 0;
  CUSTOMIZE_TEA.steps.forEach((step) => {
    const selected = step.type === "multi" ? selections[step.key] || [] : [selections[step.key] || getDefaultId(step.key)];
    selected.forEach((id) => {
      const option = getOption(step.key, id);
      if (option) total += option.price;
    });
  });
  return total;
};

// Converts the wizard selections into a clean object the 3D scene reads.
export const buildTeaConfig = (selections) => ({
  size: selections.size || getDefaultId("size"),
  tea: selections["tea"] || getDefaultId("tea"),
  boba: selections.boba || [],
  addOns: selections.addOns || [],
  sugar: selections.sugar || getDefaultId("sugar"),
});

export const getTeaBasePrice = () =>
  getOption("tea", getDefaultId("tea")).price;