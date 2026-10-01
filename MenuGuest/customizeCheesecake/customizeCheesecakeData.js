// =====================================================================
//  CUSTOMIZE CHEESECAKE — CONFIGURATION (ADMIN-FRIENDLY)
//  Every choice a guest can make for the 3D cheesecake customizer lives
//  here. The wizard, the price calculation, AND the 3D scene all read
//  from this file — so adding / editing / deleting an option only means
//  editing this array (or, later, having your admin dashboard write it).
//
//  OPTION FIELDS:
//    id     – unique key (never change once used, safe to reorder)
//    name   – shown to the customer
//    price  – in ₱, always added to the total (0 = free choice)
//    image  – preview image inside /public/images/CUSTOMIZE-CHEESECAKE
//    scene  – extra info the 3D scene uses to draw the choice
//
//  STEP FIELDS:
//    key      – unique step key ("cake", "toppings", "garnishes")
//    step     – step number in the wizard
//    title    – heading shown above the choices
//    type     – "single" (pick one) or "multi" (pick several)
//    hasImage – whether the step shows image cards
//    options  – the choices described above
//
//  STEP 4 is the final "Name + Summary" step. It has no options here —
//  CustomizeCheesecakeModal renders the name input and the summary.
//  (Pricing matches the other customizers: the total is simply the sum
//  of the chosen options — no separate base price.)
// =====================================================================

export const CUSTOMIZE_CHEESECAKE = {
  steps: [
    {
      key: "cake",
      step: 1,
      title: "Choose your Cheesecake",
      subtitle:
        "Pick the flavor of your slice — every one is baked fresh on a buttery graham crust.",
      type: "single",
      hasImage: true,
      options: [
        {
          id: "blueberry",
          name: "Blueberry",
          price: 135,
          image: "/images/CUSTOMIZE-CHEESECAKE/CHOOSE-YOUR-CHEESECAKE/cheesecake-blueberry-flavor.png",
          scene: { body: "#e8dcf3", glaze: "#8a9bd4" },
        },
        {
          id: "strawberry",
          name: "Strawberry",
          price: 135,
          image: "/images/CUSTOMIZE-CHEESECAKE/CHOOSE-YOUR-CHEESECAKE/cheesecake-strawberry-flavor.png",
          scene: { body: "#fbdee4", glaze: "#e05570" },
        },
        {
          id: "mango",
          name: "Mango",
          price: 125,
          image: "/images/CUSTOMIZE-CHEESECAKE/CHOOSE-YOUR-CHEESECAKE/cheesecake-mango-flavor.png",
          scene: { body: "#fdedc9", glaze: "#f5a623" },
        },
        {
          id: "chocolate",
          name: "Chocolate",
          price: 145,
          image: "/images/CUSTOMIZE-CHEESECAKE/CHOOSE-YOUR-CHEESECAKE/cheesecake-chocolate-flavor.png",
          scene: { body: "#9c6b42", glaze: "#43281a" },
        },
      ],
    },
    {
      key: "toppings",
      step: 2,
      title: "Choose your cheesecake toppings",
      subtitle:
        "Pick one or more — they sprinkle over the top of your slice.",
      type: "multi",
      hasImage: true,
      options: [
        {
          id: "whipped-cream",
          name: "Whipped Cream",
          price: 20,
          image: "/images/CUSTOMIZE-CHEESECAKE/TOPPINGS/whipped-cream.png",
          scene: { type: "whip" },
        },
        {
          id: "lemon-zest",
          name: "Lemon Zest",
          price: 10,
          image: "/images/CUSTOMIZE-CHEESECAKE/TOPPINGS/lemon-zest.png",
          scene: { type: "zest" },
        },
        {
          id: "white-chocolate-shavings",
          name: "White Chocolate Shavings",
          price: 15,
          image: "/images/CUSTOMIZE-CHEESECAKE/TOPPINGS/white-chocolate-shavings.png",
          scene: { type: "white-shav" },
        },
        {
          id: "graham-crumbs",
          name: "Graham Crumbs",
          price: 10,
          image: "/images/CUSTOMIZE-CHEESECAKE/TOPPINGS/graham-crumbs.png",
          scene: { type: "graham" },
        },
        {
          id: "chocolate-shavings",
          name: "Chocolate Shavings",
          price: 15,
          image: "/images/CUSTOMIZE-CHEESECAKE/TOPPINGS/chocolate-shavings.png",
          scene: { type: "choc-shav" },
        },
      ],
    },
    {
      key: "garnishes",
      step: 3,
      title: "Choose your cheesecake garnish",
      subtitle:
        "Pick one or more — fresh garnish finishes your slice.",
      type: "multi",
      hasImage: true,
      options: [
        {
          id: "fresh-blueberries",
          name: "Fresh Blueberries",
          price: 25,
          image: "/images/CUSTOMIZE-CHEESECAKE/GARNISH/blueberry-garnish.png",
          scene: { type: "blueberry" },
        },
        {
          id: "fresh-strawberries",
          name: "Fresh Strawberries",
          price: 25,
          image: "/images/CUSTOMIZE-CHEESECAKE/GARNISH/strawberry-garnish.png",
          scene: { type: "strawberry" },
        },
        {
          id: "fresh-mango-slices",
          name: "Fresh Mango Slices",
          price: 30,
          image: "/images/CUSTOMIZE-CHEESECAKE/GARNISH/mango-garnish.png",
          scene: { type: "mango" },
        },
        {
          id: "chocolate-bar",
          name: "Chocolate Bar",
          price: 20,
          image: "/images/CUSTOMIZE-CHEESECAKE/GARNISH/chocolate-garnish.png",
          scene: { type: "choc-bar" },
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
  CUSTOMIZE_CHEESECAKE.steps.find((step) => step.key === stepKey);

export const getOption = (stepKey, optionId) =>
  getStep(stepKey)?.options.find((option) => option.id === optionId);

export const getDefaultId = (stepKey) => getStep(stepKey)?.options[0]?.id;

export const getTotalPrice = (selections) => {
  let total = 0;
  CUSTOMIZE_CHEESECAKE.steps.forEach((step) => {
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
// The flavor keeps its id (single select); toppings and garnishes keep
// the guest's selection order as { id } entries.
export const buildCheesecakeConfig = (selections) => ({
  cake: selections.cake || getDefaultId("cake"),
  toppings: (selections.toppings || []).map((id) => ({ id })),
  garnishes: (selections.garnishes || []).map((id) => ({ id })),
});