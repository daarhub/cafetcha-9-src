// =====================================================================
//  CUSTOMIZE ICE CREAM — CONFIGURATION (ADMIN-FRIENDLY)
//  Every choice a guest can make for the 3D ice cream customizer lives
//  here. The wizard, the price calculation, AND the 3D scene all read
//  from this file — so adding / editing / deleting an option only means
//  editing this array (or, later, having your admin dashboard write it).
//
//  OPTION FIELDS:
//    id     – unique key (never change once used, safe to reorder)
//    name   – shown to the customer
//    price  – in ₱, always added to the total (0 = free choice)
//    image  – preview image inside /public/images/CUSTOMIZE-ICE CREAM
//    scene  – extra info the 3D scene uses to draw the choice
//
//  STEP FIELDS:
//    key      – unique step key ("flavor", "toppings", "syrup")
//    step     – step number in the wizard
//    title    – heading shown above the choices
//    type     – "single" (pick one) or "multi" (pick several)
//    hasImage – whether the step shows image cards
//    options  – the choices described above
//
//  STEP 4 is the final "Name + Summary" step. It has no options here —
//  CustomizeIceCreamModal renders the name input and the summary.
//  (Pricing matches the other customizers: the total is simply the sum
//  of the chosen options — no separate base price.)
// =====================================================================

export const CUSTOMIZE_ICE_CREAM = {
  steps: [
    {
      key: "flavor",
      step: 1,
      title: "Choose your Flavor",
      subtitle:
        "Pick one scoop flavor — every bowl is scooped fresh to order.",
      type: "single",
      hasImage: true,
      options: [
        {
          id: "vanilla",
          name: "Vanilla",
          price: 95,
          image:
            "/images/CUSTOMIZE-ICE CREAM/CHOOSE-YOUR-ICECREAM/vanilla-ice-cream.png",
          scene: { scoop: "#f8f0dc", shade: "#eadcbd", accent: "#d9bd8a" },
        },
        {
          id: "chocolate",
          name: "Chocolate",
          price: 105,
          image:
            "/images/CUSTOMIZE-ICE CREAM/CHOOSE-YOUR-ICECREAM/chocolate-ice-cream.png",
          scene: { scoop: "#6f4526", shade: "#5c371d", accent: "#462812" },
        },
        {
          id: "strawberry",
          name: "Strawberry",
          price: 110,
          image:
            "/images/CUSTOMIZE-ICE CREAM/CHOOSE-YOUR-ICECREAM/strawberry-ice-cream.png",
          scene: { scoop: "#f7b9c6", shade: "#eda2b3", accent: "#e07893" },
        },
        {
          id: "biscoff",
          name: "Biscoff",
          price: 135,
          image:
            "/images/CUSTOMIZE-ICE CREAM/CHOOSE-YOUR-ICECREAM/biscoff-ice-cream.png",
          scene: { scoop: "#cf9052", shade: "#ba7a3e", accent: "#8a5426" },
        },
        {
          id: "cookies-and-cream",
          name: "Cookies & Cream",
          price: 125,
          image:
            "/images/CUSTOMIZE-ICE CREAM/CHOOSE-YOUR-ICECREAM/cookies-and-cream-ice-cream.png",
          scene: { scoop: "#f2ede3", shade: "#e3dbcc", accent: "#3a352f" },
        },
        {
          id: "mango",
          name: "Mango",
          price: 115,
          image:
            "/images/CUSTOMIZE-ICE CREAM/CHOOSE-YOUR-ICECREAM/mango-ice-cream.png",
          scene: { scoop: "#fac361", shade: "#f2ab41", accent: "#e28f2b" },
        },
        {
          id: "coffee",
          name: "Coffee",
          price: 110,
          image:
            "/images/CUSTOMIZE-ICE CREAM/CHOOSE-YOUR-ICECREAM/coffee-ice-cream.png",
          scene: { scoop: "#b48d6b", shade: "#9f7756", accent: "#7a5537" },
        },
        {
          id: "pistachio",
          name: "Pistachio",
          price: 135,
          image:
            "/images/CUSTOMIZE-ICE CREAM/CHOOSE-YOUR-ICECREAM/pistachio-ice-cream.png",
          scene: { scoop: "#c8d497", shade: "#b3c27d", accent: "#94a75c" },
        },
      ],
    },
    {
      key: "toppings",
      step: 2,
      title: "Choose your ice cream toppings",
      subtitle:
        "Pick one or more — they scatter over the top of your scoops.",
      type: "multi",
      hasImage: true,
      options: [
        {
          id: "chocolate-chips",
          name: "Chocolate Chips",
          price: 15,
          image: "/images/CUSTOMIZE-ICE CREAM/TOPPINGS/chocolate-chips.png",
          scene: { type: "chips" },
        },
        {
          id: "maraschino-cherry",
          name: "Maraschino Cherry",
          price: 15,
          image: "/images/CUSTOMIZE-ICE CREAM/TOPPINGS/maraschino-cherry.png",
          scene: { type: "cherry" },
        },
        {
          id: "marshmallows",
          name: "Marshmallows",
          price: 15,
          image: "/images/CUSTOMIZE-ICE CREAM/TOPPINGS/marshmallows.png",
          scene: { type: "marshmallow" },
        },
        {
          id: "chopped-nuts",
          name: "Chopped Nuts",
          price: 20,
          image: "/images/CUSTOMIZE-ICE CREAM/TOPPINGS/crushed-nuts.png",
          scene: { type: "nuts" },
        },
        {
          id: "chocolate-candy",
          name: "Chocolate Candy",
          price: 20,
          image: "/images/CUSTOMIZE-ICE CREAM/TOPPINGS/chocolate-candy.png",
          scene: { type: "choc-candy" },
        },
        {
          id: "fruity-candy",
          name: "Fruity Candy",
          price: 15,
          image: "/images/CUSTOMIZE-ICE CREAM/TOPPINGS/fruity-candy.png",
          scene: { type: "fruity-candy" },
        },
        {
          id: "oreo-crumbs",
          name: "Oreo Crumbs",
          price: 15,
          image: "/images/CUSTOMIZE-ICE CREAM/TOPPINGS/oreo-crumbs.png",
          scene: { type: "oreo" },
        },
        {
          id: "biscoff-crumbs",
          name: "Biscoff Crumbs",
          price: 20,
          image: "/images/CUSTOMIZE-ICE CREAM/TOPPINGS/biscoff-crumbs.png",
          scene: { type: "biscoff-crumbs" },
        },
        {
          id: "sprinkles",
          name: "Sprinkles",
          price: 10,
          image: "/images/CUSTOMIZE-ICE CREAM/TOPPINGS/sprinkles.png",
          scene: { type: "sprinkles" },
        },
        {
          id: "chocolate-shavings",
          name: "Chocolate Shavings",
          price: 15,
          image: "/images/CUSTOMIZE-ICE CREAM/TOPPINGS/chocolate-shavings.png",
          scene: { type: "choc-shav" },
        },
        {
          id: "strawberry-slices",
          name: "Strawberry Slices",
          price: 25,
          image: "/images/CUSTOMIZE-ICE CREAM/TOPPINGS/strawberry-slices.png",
          scene: { type: "straw-slices" },
        },
        {
          id: "fresh-blueberries",
          name: "Fresh Blueberries",
          price: 25,
          image: "/images/CUSTOMIZE-ICE CREAM/TOPPINGS/blueberry-garnish.png",
          scene: { type: "blueberry" },
        },
        {
          id: "mango-chunks",
          name: "Mango Chunks",
          price: 25,
          image: "/images/CUSTOMIZE-ICE CREAM/TOPPINGS/mango-chunks.png",
          scene: { type: "mango-chunks" },
        },
      ],
    },
    {
      key: "syrup",
      step: 3,
      title: "Choose your ice cream syrup",
      subtitle:
        "Pick one or more — drizzled over your scoops right at the counter.",
      type: "multi",
      hasImage: true,
      options: [
        {
          id: "chocolate-fudge-sauce",
          name: "Chocolate Fudge Sauce",
          price: 20,
          image: "/images/CUSTOMIZE-ICE CREAM/SYRUP/chocolate-fudge-sauce.png",
          scene: { color: "#43281a" },
        },
        {
          id: "white-chocolate-sauce",
          name: "White Chocolate Sauce",
          price: 20,
          image: "/images/CUSTOMIZE-ICE CREAM/SYRUP/white-chocolate-sauce.png",
          scene: { color: "#f3ecda" },
        },
        {
          id: "caramel-sauce",
          name: "Caramel Sauce",
          price: 20,
          image: "/images/CUSTOMIZE-ICE CREAM/SYRUP/caramel-sauce.png",
          scene: { color: "#c47a2a" },
        },
        {
          id: "biscoff-sauce",
          name: "Biscoff Sauce",
          price: 25,
          image: "/images/CUSTOMIZE-ICE CREAM/SYRUP/biscoff-sauce.png",
          scene: { color: "#b5722f" },
        },
        {
          id: "strawberry-compote",
          name: "Strawberry Compote",
          price: 25,
          image: "/images/CUSTOMIZE-ICE CREAM/SYRUP/strawberry-compote.png",
          scene: { color: "#d94f63" },
        },
        {
          id: "blueberry-compote",
          name: "Blueberry Compote",
          price: 25,
          image: "/images/CUSTOMIZE-ICE CREAM/SYRUP/blueberry-compote.png",
          scene: { color: "#5a4a8a" },
        },
        {
          id: "peanut-butter-sauce",
          name: "Peanut Butter Sauce",
          price: 20,
          image: "/images/CUSTOMIZE-ICE CREAM/SYRUP/peanut-butter-sauce.png",
          scene: { color: "#c98f3d" },
        },
        {
          id: "pistachio-sauce",
          name: "Pistachio Sauce",
          price: 25,
          image: "/images/CUSTOMIZE-ICE CREAM/SYRUP/pistachio-sauce.png",
          scene: { color: "#a8c060" },
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------
//  HELPERS — the wizard and the 3D scene use these so everything stays
//  in sync even when an admin edits the options above.
// ---------------------------------------------------------------------
export const getStep = (stepKey) =>
  CUSTOMIZE_ICE_CREAM.steps.find((step) => step.key === stepKey);

export const getOption = (stepKey, optionId) =>
  getStep(stepKey)?.options.find((option) => option.id === optionId);

export const getDefaultId = (stepKey) => getStep(stepKey)?.options[0]?.id;

export const getTotalPrice = (selections) => {
  let total = 0;
  CUSTOMIZE_ICE_CREAM.steps.forEach((step) => {
    const selected =
      step.type === "multi"
        ? selections[step.key] || []
        : [selections[step.key] || getDefaultId(step.key)];
    selected.forEach((id) => {
      const option = getOption(step.key, id);
      if (option) total += option.price;
    });
  });
  return total;
};

// Converts the wizard selections into a clean object the 3D scene reads.
// The flavor keeps its id (single select); toppings and syrups keep the
// guest's selection order as { id } entries.
export const buildIceCreamConfig = (selections) => ({
  flavor: selections.flavor || getDefaultId("flavor"),
  toppings: (selections.toppings || []).map((id) => ({ id })),
  syrup: (selections.syrup || []).map((id) => ({ id })),
});
