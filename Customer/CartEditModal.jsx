import { Check, Minus, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getItemOptions } from "../MenuGuest/menuData";
import { getAllManagedMenuItems } from "../MenuGuest/menuAvailabilityStore";
import {
  CUSTOMIZE_BURGER,
  getOption as getBurgerOption,
} from "../MenuGuest/customizeBurger/customizeBurgerData";
import {
  CUSTOMIZE_CHEESECAKE,
  getOption as getCheesecakeOption,
} from "../MenuGuest/customizeCheesecake/customizeCheesecakeData";
import {
  CUSTOMIZE_FRAPPE,
  getOption as getFrappeOption,
} from "../MenuGuest/customizeFrappe/customizeFrappeData";
import {
  CUSTOMIZE_ICE_CREAM,
  getOption as getIceCreamOption,
} from "../MenuGuest/customizeIceCream/customizeIceCreamData";
import {
  CUSTOMIZE_SANDWICH,
  getOption as getSandwichOption,
} from "../MenuGuest/customizeSandwich/customizeSandwichData";
import {
  CUSTOMIZE_TEA,
  getOption as getTeaOption,
} from "../MenuGuest/customizeTea/customizeTeaData";
import { summarizeSelections, updateCartLine } from "./customerStore";
import { notify } from "./toastStore";
import "./CartEditModal.css";

// Customizer data used to re-edit a saved custom build — the step/option
// definitions plus each module's getOption() so prices and summaries are
// rebuilt exactly like the original customizer.
const CUSTOMIZE_DATA = {
  "custom-frappe": { steps: CUSTOMIZE_FRAPPE.steps, getOption: getFrappeOption },
  "custom-tea": { steps: CUSTOMIZE_TEA.steps, getOption: getTeaOption },
  "custom-sandwich": {
    steps: CUSTOMIZE_SANDWICH.steps,
    getOption: getSandwichOption,
  },
  "custom-burger": {
    steps: CUSTOMIZE_BURGER.steps,
    getOption: getBurgerOption,
  },
  "custom-cheesecake": {
    steps: CUSTOMIZE_CHEESECAKE.steps,
    getOption: getCheesecakeOption,
  },
  "custom-icecream": {
    steps: CUSTOMIZE_ICE_CREAM.steps,
    getOption: getIceCreamOption,
  },
};

// Generic price calc that matches every customizer's getTotalPrice: the sum
// of the chosen options' prices (multi steps add each chosen option).
const computeCustomizePrice = (steps, selections, getOption) =>
  steps.reduce((sum, step) => {
    const ids =
      step.type === "multi" || Array.isArray(selections[step.key])
        ? selections[step.key] || []
        : [selections[step.key] || step.options[0]?.id];
    return (
      sum +
      ids.reduce((part, id) => part + (getOption(step.key, id)?.price || 0), 0)
    );
  }, 0);

// Cart lines store a customize build's choices in `config`, but the shape
// differs by customizer: frappe/tea keep raw ids, while burger/sandwich/
// cheesecake/ice cream run their values through build*Config() for the 3D
// scene — wrapping multi choices as { id } objects and even renaming keys
// (the burger wizard's "cheese" step is saved as "cheeses"). Normalize any
// shape back to raw ids so the edit modal re-highlights what was ordered.
const toId = (value) =>
  value && typeof value === "object" ? value.id : value;

const idsFromConfig = (value) => [
  ...new Set(
    (Array.isArray(value) ? value : [value]).map(toId).filter(Boolean),
  ),
];

// Trailing colons on old tea step titles ("Add-ons:") are ignored when
// matching saved summary groups against step titles.
const cleanGroupLabel = (label) => String(label || "").replace(/:\s*$/, "");

function CartEditModal({ line, onClose }) {
  const isCustomize = line.kind === "customize";
  const allItems = getAllManagedMenuItems();
  const item = isCustomize
    ? null
    : allItems.find((entry) => entry.id === line.productId);
  const groups = item ? getItemOptions(item) : [];
  const data = isCustomize ? CUSTOMIZE_DATA[line.productId] : null;
  const steps = data?.steps || [];
  const getOption = data?.getOption;

  const [quantity, setQuantity] = useState(line.quantity);
  const [buildName, setBuildName] = useState(line.name);
  const [selections, setSelections] = useState(() => {
    const initial = {};
    if (isCustomize) {
      // Prefer the saved config; whenever a step is missing or empty there
      // (renamed key, older line, …), rebuild it from the saved summary —
      // summarizeSelections records every choice as
      // { group: step.title, choice: option.name }.
      const fromSummary = (step) =>
        (line.summary || [])
          // Match groups colon-insensitively — summaries saved by the old
          // tea titles ("Add-ons:") still match the cleaned step titles.
          .filter(
            (entry) =>
              cleanGroupLabel(entry.group) ===
              cleanGroupLabel(step.title),
          )
          .map(
            (entry) =>
              step.options.find((option) => option.name === entry.choice)?.id,
          )
          .filter(Boolean);
      steps.forEach((step) => {
        const fromConfig = idsFromConfig((line.config || {})[step.key]);
        initial[step.key] =
          step.type === "multi"
            ? fromConfig.length
              ? fromConfig
              : fromSummary(step)
            : fromConfig[0] || fromSummary(step)[0] || step.options[0]?.id;
      });
    } else {
      // Regular products: match every summary entry back to its choice by
      // label (falling back to the id) so all saved extras re-highlight.
      groups.forEach((group) => {
        const findChoice = (entry) =>
          group.choices.find(
            (choice) =>
              choice.label === entry.choice || choice.id === entry.choice,
          );
        if (group.type === "multi") {
          initial[group.id] = [
            ...new Set(
              (line.summary || [])
                .filter((entry) => entry.group === group.label)
                .map(findChoice)
                .filter(Boolean)
                .map((choice) => choice.id),
            ),
          ];
        } else {
          const entry = (line.summary || []).find(
            (e) => e.group === group.label,
          );
          const match = entry && findChoice(entry);
          initial[group.id] = match
            ? match.id
            : group.defaultId || group.choices[0]?.id;
        }
      });
    }
    return initial;
  });

  // Close on Escape and lock page scrolling while the modal is open.
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const toggleChoice = (groupId, choiceId, type) => {
    setSelections((current) => ({
      ...current,
      [groupId]:
        type === "multi"
          ? (current[groupId] || []).includes(choiceId)
            ? (current[groupId] || []).filter((id) => id !== choiceId)
            : [...(current[groupId] || []), choiceId]
          : choiceId,
    }));
  };

  // Same math as the product modal: base price + every priced extra.
  const unitPrice = isCustomize
    ? computeCustomizePrice(steps, selections, getOption)
    : item
      ? item.price +
        groups.reduce((sum, group) => {
          if (group.type === "multi") {
            return (
              sum +
              (selections[group.id] || []).reduce((part, choiceId) => {
                const choice = group.choices.find(
                  (choice) => choice.id === choiceId,
                );
                return part + (choice?.price || 0);
              }, 0)
            );
          }
          const chosenId =
            selections[group.id] || group.defaultId || group.choices[0]?.id;
          const choice = group.choices.find((entry) => entry.id === chosenId);
          return sum + (choice?.price || 0);
        }, 0)
      : line.price;

  const newSummary = isCustomize
    ? summarizeSelections(steps, selections, getOption)
    : groups.flatMap((group) => {
        if (group.type === "multi") {
          return (selections[group.id] || [])
            .map((choiceId) =>
              group.choices.find((choice) => choice.id === choiceId),
            )
            .filter(Boolean)
            .map((choice) => ({ group: group.label, choice: choice.label }));
        }
        const chosenId =
          selections[group.id] || group.defaultId || group.choices[0]?.id;
        const choice = group.choices.find((entry) => entry.id === chosenId);
        return choice ? [{ group: group.label, choice: choice.label }] : [];
      });

  const handleSave = () => {
    const changes = { quantity, price: unitPrice, summary: newSummary };
    if (isCustomize) {
      changes.name = buildName.trim() || line.name;
      changes.config = {
        ...selections,
        name: changes.name,
        price: unitPrice,
        summary: newSummary,
      };
    }
    updateCartLine(line.uid, changes);
    notify("Item updated.");
    onClose();
  };

  return createPortal(
    <div className="cart-edit-backdrop" role="presentation" onClick={onClose}>
      <section
        className="cart-edit"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-edit-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="cart-edit-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="cart-edit-head">
          <span className="cart-edit-thumb">
            <img src={line.image} alt={line.name} />
          </span>
          <div>
            <h2 id="cart-edit-title">Edit item</h2>
            <p className="cart-edit-sub">{line.name}</p>
          </div>
        </div>

        <div className="cart-edit-body">
          {isCustomize && (
            <label className="cart-edit-name">
              Build name
              <input
                type="text"
                maxLength={40}
                value={buildName}
                onChange={(event) => setBuildName(event.target.value)}
                placeholder="Your custom build's name"
              />
            </label>
          )}

          {(isCustomize
            ? steps.map((step) => ({
                id: step.key,
                label: step.title,
                type: step.type,
                choices: step.options,
              }))
            : groups.map((group) => ({
                id: group.id,
                label: group.label,
                type: group.type,
                choices: group.choices,
              }))
          ).map((group) => (
            <div className="cart-edit-group" key={group.id}>
              <h3>{group.label}</h3>
              <div className="cart-edit-choices">
                {group.choices.map((choice) => {
                  const chosen =
                    group.type === "multi"
                      ? (selections[group.id] || []).includes(choice.id)
                      : selections[group.id] === choice.id;
                  return (
                    <button
                      key={choice.id}
                      type="button"
                      className={`cart-edit-choice${
                        chosen ? " selected" : ""
                      }`}
                      onClick={() =>
                        toggleChoice(group.id, choice.id, group.type)
                      }
                      aria-pressed={chosen}
                    >
                      {choice.label || choice.name}
                      {choice.price ? <span className="cart-edit-price">+₱{choice.price}</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="cart-edit-qty-row">
            <span>Quantity</span>
            <div className="cart-edit-qty" aria-label="Quantity">
              <button
                type="button"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                disabled={quantity === 1}
                aria-label="Decrease quantity"
              >
                <Minus size={14} />
              </button>
              <span>{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((value) => Math.min(20, value + 1))}
                disabled={quantity === 20}
                aria-label="Increase quantity"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="cart-edit-footer">
          <strong className="cart-edit-total">
            ₱{(unitPrice * quantity).toLocaleString()}
          </strong>
          <div className="cart-edit-footer-actions">
            <button
              type="button"
              className="cart-edit-cancel"
              onClick={onClose}
            >
              Cancel Changes
            </button>
            <button
              type="button"
              className="cart-edit-save"
              onClick={handleSave}
            >
              <Check size={15} /> Save Changes
            </button>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}

export default CartEditModal;