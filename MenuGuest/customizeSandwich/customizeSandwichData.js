// =====================================================================
//  CUSTOMIZE SANDWICH — CONFIGURATION (ADMIN-FRIENDLY)
//  Every choice a guest can make for the 3D sandwich customizer lives
//  here. The wizard, the price calculation, AND the 3D scene all read
//  from this file — so adding / editing / deleting an option only means
//  editing this array (or, later, having your admin dashboard write it).
//
//  OPTION FIELDS:
//    id     – unique key (never change once used, safe to reorder)
//    name   – shown to the customer
//    price  – in ₱, always added to the total (0 = free choice)
//    image  – preview image inside /public/images/CUSTOMIZE-SANDWICH
//    scene  – extra info the 3D scene uses to draw the choice
//             (layer type, color, stack height)
//
//  STEP FIELDS:
//    key      – unique step key ("fillings", "vegetables", "sauces")
//    step     – step number in the wizard
//    title    – heading shown above the choices
//    subtitle – optional extra text under the heading
//    type     – "multi" (pick several — every sandwich step is multi)
//    hasImage – whether the step shows image cards
//    options  – the choices described above
//
//  STEP 4 is the final "Name + Summary" step. It has no options here —
//  CustomizeSandwichModal renders the name input and the summary.
//  (Pricing matches the frappe/tea customizers: the total is simply the
//  sum of the chosen options — there is no separate base price.)
// =====================================================================

export const CUSTOMIZE_SANDWICH = {
  steps: [
    {
      key: "fillings",
      step: 1,
      title: "Choose your sandwich fillings",
      subtitle:
        "Pick one or more fillings — they stack up in order inside the toasted loaf.",
      type: "multi",
      hasImage: true,
      options: [
        {
          id: "grilled-chicken",
          name: "Grilled Chicken",
          price: 65,
          image: "/images/CUSTOMIZE-SANDWICH/FILLINGS/grilled-chicken.png",
          scene: { type: "grilled-chicken", color: "#c98d4b", height: 0.1 },
        },
        {
          id: "crispy-chicken",
          name: "Crispy Chicken",
          price: 60,
          image: "/images/CUSTOMIZE-SANDWICH/FILLINGS/crispy-chicken.png",
          scene: { type: "crispy-chicken", color: "#d9912f", height: 0.2 },
        },
        {
          id: "tuna",
          name: "Tuna",
          price: 55,
          image: "/images/CUSTOMIZE-SANDWICH/FILLINGS/tuna.png",
          scene: { type: "tuna", color: "#eed7bb", height: 0.12 },
        },
        {
          id: "ham",
          name: "Ham",
          price: 45,
          image: "/images/CUSTOMIZE-SANDWICH/FILLINGS/ham.png",
          scene: { type: "ham", color: "#f2a0aa", height: 0.09 },
        },
        {
          id: "bacon",
          name: "Bacon",
          price: 50,
          image: "/images/CUSTOMIZE-SANDWICH/FILLINGS/bacon.png",
          scene: { type: "bacon", color: "#a3542f", height: 0.09 },
        },
        {
          id: "sunny-side-up-egg",
          name: "Sunny Side Up Egg",
          price: 25,
          image: "/images/CUSTOMIZE-SANDWICH/FILLINGS/sunny-side-up-egg.png",
          scene: { type: "egg", color: "#f9f3e6", height: 0.22 },
        },
      ],
    },
    {
      key: "vegetables",
      step: 2,
      title: "Choose your sandwich vegetables",
      subtitle:
        "Pick one or more. Lettuce is laid under the fillings — the rest pile on top.",
      type: "multi",
      hasImage: true,
      options: [
        {
          id: "lettuce",
          name: "Lettuce",
          price: 15,
          image: "/images/CUSTOMIZE-SANDWICH/VEGETABLES/lettuce.png",
          scene: { type: "lettuce", color: "#79b63c", height: 0.06 },
        },
        {
          id: "tomato",
          name: "Tomato",
          price: 15,
          image: "/images/CUSTOMIZE-SANDWICH/VEGETABLES/tomato.png",
          scene: { type: "tomato", color: "#e4573d", height: 0.08 },
        },
        {
          id: "onion",
          name: "Onion",
          price: 10,
          image: "/images/CUSTOMIZE-SANDWICH/VEGETABLES/onion.png",
          scene: { type: "onion", color: "#e8e0f2", height: 0.06 },
        },
        {
          id: "cucumber",
          name: "Cucumber",
          price: 10,
          image: "/images/CUSTOMIZE-SANDWICH/VEGETABLES/cucumber.png",
          scene: { type: "cucumber", color: "#6da33e", height: 0.07 },
        },
        {
          id: "pickles",
          name: "Pickles",
          price: 10,
          image: "/images/CUSTOMIZE-SANDWICH/VEGETABLES/pickles.png",
          scene: { type: "pickles", color: "#93b843", height: 0.07 },
        },
        {
          id: "jalapenos",
          name: "Jalapeños",
          price: 15,
          image: "/images/CUSTOMIZE-SANDWICH/VEGETABLES/jalapeno.png",
          scene: { type: "jalapenos", color: "#4e8f3a", height: 0.08 },
        },
        {
          id: "coleslaw",
          name: "Coleslaw",
          price: 20,
          image: "/images/CUSTOMIZE-SANDWICH/VEGETABLES/coleslaw.png",
          scene: { type: "coleslaw", color: "#f7f3e6", height: 0.07 },
        },
      ],
    },
    {
      key: "sauces",
      step: 3,
      title: "Choose your sandwich sauce",
      subtitle:
        "Pick one or more sauces — each one is drizzled over the top of your stack.",
      type: "multi",
      hasImage: true,
      options: [
        {
          id: "mayonnaise",
          name: "Mayonnaise",
          price: 10,
          image: "/images/CUSTOMIZE-SANDWICH/SAUCES/mayonnaise.png",
          scene: { color: "#f7f0dc" },
        },
        {
          id: "garlic-mayo",
          name: "Garlic Mayo",
          price: 15,
          image: "/images/CUSTOMIZE-SANDWICH/SAUCES/garlic-mayo.png",
          scene: { color: "#f3e9c8" },
        },
        {
          id: "ketchup",
          name: "Ketchup",
          price: 10,
          image: "/images/CUSTOMIZE-SANDWICH/SAUCES/ketchup.png",
          scene: { color: "#c0342b" },
        },
        {
          id: "honey-mustard",
          name: "Honey Mustard",
          price: 15,
          image: "/images/CUSTOMIZE-SANDWICH/SAUCES/honey-mustard.png",
          scene: { color: "#e3a92e" },
        },
        {
          id: "thousand-island",
          name: "Thousand Island",
          price: 15,
          image: "/images/CUSTOMIZE-SANDWICH/SAUCES/thousand-island.png",
          scene: { color: "#e8825f" },
        },
        {
          id: "ranch",
          name: "Ranch",
          price: 15,
          image: "/images/CUSTOMIZE-SANDWICH/SAUCES/ranch.png",
          scene: { color: "#f5f2e6" },
        },
        {
          id: "caesar-dressing",
          name: "Caesar Dressing",
          price: 20,
          image: "/images/CUSTOMIZE-SANDWICH/SAUCES/caesar-dressing.png",
          scene: { color: "#dccfa6" },
        },
        {
          id: "pesto-sauce",
          name: "Pesto Sauce",
          price: 20,
          image: "/images/CUSTOMIZE-SANDWICH/SAUCES/pesto-sauce.png",
          scene: { color: "#5d7a2f" },
        },
        {
          id: "spicy-mayo",
          name: "Spicy Mayo",
          price: 15,
          image: "/images/CUSTOMIZE-SANDWICH/SAUCES/spicy-mayo.png",
          scene: { color: "#f0a45f" },
        },
        {
          id: "barbecue-sauce",
          name: "Barbecue Sauce",
          price: 15,
          image: "/images/CUSTOMIZE-SANDWICH/SAUCES/barbecue-sauce.png",
          scene: { color: "#6b3320" },
        },
        {
          id: "cheese-sauce",
          name: "Cheese Sauce",
          price: 25,
          image: "/images/CUSTOMIZE-SANDWICH/SAUCES/cheese-sauce.png",
          scene: { color: "#f2b12e" },
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
  CUSTOMIZE_SANDWICH.steps.find((step) => step.key === stepKey);

export const getOption = (stepKey, optionId) =>
  getStep(stepKey)?.options.find((option) => option.id === optionId);

export const getTotalPrice = (selections) => {
  let total = 0;
  CUSTOMIZE_SANDWICH.steps.forEach((step) => {
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
// exactly that order (fillings stack between the loaf slices, lettuce sits
// under the fillings, the other vegetables and the sauces pile on top).
export const buildSandwichConfig = (selections) => ({
  fillings: (selections.fillings || []).map((id) => ({ id })),
  vegetables: (selections.vegetables || []).map((id) => ({ id })),
  sauces: (selections.sauces || []).map((id) => ({ id })),
});
