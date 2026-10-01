// =====================================================================
//  CUSTOMIZE BURGER — CONFIGURATION (ADMIN-FRIENDLY)
//  Every choice a guest can make for the 3D burger customizer lives
//  here. The wizard, the price calculation, AND the 3D scene all read
//  from this file — so adding / editing / deleting an option only means
//  editing this array (or, later, having your admin dashboard write it).
//
//  OPTION FIELDS:
//    id     – unique key (never change once used, safe to reorder)
//    name   – shown to the customer
//    price  – in ₱, always added to the total (0 = free choice)
//    image  – preview image inside /public/images/CUSTOMIZE-HAMBURGER
//    scene  – extra info the 3D scene uses to draw the choice
//             (layer type, color, stack height)
//
//  STEP FIELDS:
//    key      – unique step key ("fillings", "vegetables", "cheese",
//               "sauces")
//    step     – step number in the wizard
//    title    – heading shown above the choices
//    subtitle – optional extra text under the heading
//    type     – "multi" (pick several — every burger step is multi)
//    hasImage – whether the step shows image cards
//    options  – the choices described above
//
//  STEP 5 is the final "Name + Summary" step. It has no options here —
//  CustomizeBurgerModal renders the name input and the summary.
//  (Pricing matches the frappe/tea/sandwich customizers: the total is
//  simply the sum of the chosen options — no separate base price.)
// =====================================================================

export const CUSTOMIZE_BURGER = {
  steps: [
    {
      key: "fillings",
      step: 1,
      title: "Choose your burger fillings",
      subtitle:
        "Pick one or more fillings — they stack up in order on the bottom bun.",
      type: "multi",
      hasImage: true,
      options: [
        {
          id: "crispy-chicken",
          name: "Crispy Chicken",
          price: 55,
          image: "/images/CUSTOMIZE-HAMBURGER/FILLINGS/crispy-chicken.png",
          scene: { type: "crispy-chicken", color: "#d9912f", height: 0.14 },
        },
        {
          id: "extra-crispy-chicken",
          name: "Extra Crispy Chicken",
          price: 65,
          image: "/images/CUSTOMIZE-HAMBURGER/FILLINGS/extra-crispy-chicken.png",
          scene: { type: "crispy-chicken-extra", color: "#c67a1e", height: 0.17 },
        },
        {
          id: "beef-patty",
          name: "Beef Patty",
          price: 70,
          image: "/images/CUSTOMIZE-HAMBURGER/FILLINGS/beef-patty.png",
          scene: { type: "beef-patty", color: "#8a5a2e", height: 0.24 },
        },
        {
          id: "double-beef-patty",
          name: "Double Beef Patty",
          price: 110,
          image: "/images/CUSTOMIZE-HAMBURGER/FILLINGS/double-beef-patty.png",
          scene: { type: "beef-patty-double", color: "#8a5a2e", height: 0.375 },
        },
        {
          id: "bacon",
          name: "Bacon",
          price: 50,
          image: "/images/CUSTOMIZE-HAMBURGER/FILLINGS/Copy of bacon.png",
          scene: { type: "bacon", color: "#a3542f", height: 0.09 },
        },
        {
          id: "egg",
          name: "Egg",
          price: 25,
          image: "/images/CUSTOMIZE-HAMBURGER/FILLINGS/sunny-side-up-egg.png",
          scene: { type: "egg", color: "#f9f3e6", height: 0.2 },
        },
      ],
    },
    {
      key: "vegetables",
      step: 2,
      title: "Choose your burger vegetables",
      subtitle:
        "Pick one or more — they share one fresh row on top of the lettuce.",
      type: "multi",
      hasImage: true,
      options: [
        {
          id: "lettuce",
          name: "Lettuce",
          price: 15,
          image: "/images/CUSTOMIZE-HAMBURGER/VEGETABLES/lettuce.png",
          scene: { type: "lettuce", color: "#79b63c", height: 0.06 },
        },
        {
          id: "tomato",
          name: "Tomato",
          price: 15,
          image: "/images/CUSTOMIZE-HAMBURGER/VEGETABLES/tomato.png",
          scene: { type: "tomato", color: "#e4573d", height: 0.08 },
        },
        {
          id: "onion",
          name: "Onion",
          price: 10,
          image: "/images/CUSTOMIZE-HAMBURGER/VEGETABLES/onion.png",
          scene: { type: "onion", color: "#e8e0f2", height: 0.06 },
        },
        {
          id: "cucumber",
          name: "Cucumber",
          price: 10,
          image: "/images/CUSTOMIZE-HAMBURGER/VEGETABLES/cucumber.png",
          scene: { type: "cucumber", color: "#6da33e", height: 0.07 },
        },
        {
          id: "pickles",
          name: "Pickles",
          price: 10,
          image: "/images/CUSTOMIZE-HAMBURGER/VEGETABLES/pickles.png",
          scene: { type: "pickles", color: "#93b843", height: 0.07 },
        },
        {
          id: "jalapenos",
          name: "Jalapeños",
          price: 15,
          image: "/images/CUSTOMIZE-HAMBURGER/VEGETABLES/jalapeno.png",
          scene: { type: "jalapenos", color: "#4e8f3a", height: 0.08 },
        },
        {
          id: "coleslaw",
          name: "Coleslaw",
          price: 20,
          image: "/images/CUSTOMIZE-HAMBURGER/VEGETABLES/coleslaw.png",
          scene: { type: "coleslaw", color: "#f7f3e6", height: 0.07 },
        },
      ],
    },
    {
      key: "cheese",
      step: 3,
      title: "Choose your cheese",
      subtitle:
        "Pick one or more — slices melt over the fillings, the sauce drizzles across them.",
      type: "multi",
      hasImage: true,
      options: [
        {
          id: "american-cheese",
          name: "American Cheese",
          price: 20,
          image: "/images/CUSTOMIZE-HAMBURGER/CHEESE/american-cheese.png",
          scene: { type: "slice", color: "#f7c064" },
        },
        {
          id: "cheddar-cheese",
          name: "Cheddar Cheese",
          price: 20,
          image: "/images/CUSTOMIZE-HAMBURGER/CHEESE/cheddar-cheese.png",
          scene: { type: "slice", color: "#f0932a" },
        },
        {
          id: "cheese-sauce",
          name: "Cheese Sauce",
          price: 25,
          image: "/images/CUSTOMIZE-HAMBURGER/CHEESE/cheese-sauce.png",
          scene: { type: "sauce", color: "#f2b12e" },
        },
      ],
    },
    {
      key: "sauces",
      step: 4,
      title: "Choose your burger sauce",
      subtitle:
        "Pick one or more sauces — each one is drizzled over the top of your stack.",
      type: "multi",
      hasImage: true,
      options: [
        {
          id: "mayonnaise",
          name: "Mayonnaise",
          price: 10,
          image: "/images/CUSTOMIZE-HAMBURGER/SAUCES/mayonnaise.png",
          scene: { color: "#f7f0dc" },
        },
        {
          id: "garlic-mayo",
          name: "Garlic Mayo",
          price: 15,
          image: "/images/CUSTOMIZE-HAMBURGER/SAUCES/garlic-mayo.png",
          scene: { color: "#f3e9c8" },
        },
        {
          id: "ketchup",
          name: "Ketchup",
          price: 10,
          image: "/images/CUSTOMIZE-HAMBURGER/SAUCES/ketchup.png",
          scene: { color: "#c0342b" },
        },
        {
          id: "honey-mustard",
          name: "Honey Mustard",
          price: 15,
          image: "/images/CUSTOMIZE-HAMBURGER/SAUCES/honey-mustard.png",
          scene: { color: "#e3a92e" },
        },
        {
          id: "thousand-island",
          name: "Thousand Island",
          price: 15,
          image: "/images/CUSTOMIZE-HAMBURGER/SAUCES/thousand-island.png",
          scene: { color: "#e8825f" },
        },
        {
          id: "ranch",
          name: "Ranch",
          price: 15,
          image: "/images/CUSTOMIZE-HAMBURGER/SAUCES/ranch.png",
          scene: { color: "#f5f2e6" },
        },
        {
          id: "spicy-mayo",
          name: "Spicy Mayo",
          price: 15,
          image: "/images/CUSTOMIZE-HAMBURGER/SAUCES/spicy-mayo.png",
          scene: { color: "#f0a45f" },
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
  CUSTOMIZE_BURGER.steps.find((step) => step.key === stepKey);

export const getOption = (stepKey, optionId) =>
  getStep(stepKey)?.options.find((option) => option.id === optionId);

export const getTotalPrice = (selections) => {
  let total = 0;
  CUSTOMIZE_BURGER.steps.forEach((step) => {
    (selections[step.key] || []).forEach((id) => {
      const option = getOption(step.key, id);
      if (option) total += option.price;
    });
  });
  return total;
};

// Converts the wizard selections into a clean object the 3D scene reads.
// Every list keeps the guest's selection order and carries { id } entries —
// the 3D stack resolves each entry back to its option and layers it in
// exactly that order with the same dynamic layout engine as the sandwich.
export const buildBurgerConfig = (selections) => ({
  fillings: (selections.fillings || []).map((id) => ({ id })),
  vegetables: (selections.vegetables || []).map((id) => ({ id })),
  cheeses: (selections.cheese || []).map((id) => ({ id })),
  sauces: (selections.sauces || []).map((id) => ({ id })),
});
