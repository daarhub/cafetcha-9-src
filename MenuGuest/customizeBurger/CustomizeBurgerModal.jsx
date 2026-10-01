import { Check, ChevronLeft, ChevronRight, ShoppingCart, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  buildBurgerConfig,
  CUSTOMIZE_BURGER,
  getOption,
  getStep,
  getTotalPrice,
} from "./customizeBurgerData";
import { summarizeSelections } from "../../Customer/customerStore";
import BurgerScene3D from "./BurgerScene3D";
import "./CustomizeBurgerModal.css";

const TOTAL_STEPS = 5; // 4 real steps + the final summary

// Rebuild the wizard's selections object from a saved order summary so
// "You Might Like" reorder cards can re-open the customizer pre-chosen.
const selectionsFromSummary = (steps, summary) => {
  const result = {};
  steps.forEach((step) => {
    result[step.key] = step.type === "multi" ? [] : step.options[0].id;
  });
  (summary || []).forEach((entry) => {
    const step = steps.find((candidate) => candidate.title === entry.group);
    if (!step) return;
    const option = step.options.find(
      (candidate) => candidate.name === entry.choice,
    );
    if (!option) return;
    if (step.type === "multi") {
      result[step.key].push(option.id);
    } else {
      result[step.key] = option.id;
    }
  });
  return result;
};

// Image card shown on steps that have pictures
// (fillings / vegetables / cheese / sauces).
function OptionCard({ stepData, option, selected, onToggle }) {
  return (
    <button
      type="button"
      className={`bg-option-card${selected ? " selected" : ""}`}
      onClick={onToggle}
      aria-pressed={selected}
    >
      {stepData.hasImage && option.image ? (
        <img src={option.image} alt={option.name} />
      ) : null}
      <span className="bg-option-name">{option.name}</span>
      <span className="bg-option-price">₱{option.price}</span>
      {stepData.type === "multi" && selected && (
        <span className="bg-option-check">
          <Check size={13} strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

// Pill choice for steps without images (kept for UI parity with the
// other customizers — every burger step currently has images).
function Pill({ option, selected, onToggle }) {
  return (
    <button
      type="button"
      className={`bg-pill${selected ? " selected" : ""}`}
      onClick={onToggle}
      aria-pressed={selected}
    >
      <span>{option.name}</span>
      {option.price > 0 ? <em>+₱{option.price}</em> : null}
    </button>
  );
}

function CustomizeBurgerModal({
  onClose,
  onRequireLogin,
  escapeLocked = false,
  initialName = "",
  initialSummary = null,
}) {
  const [step, setStep] = useState(1);
  // guest's custom burger name; auto-numbered when left blank (for the
  // upcoming customer-account cart function)
  const [burgerName, setBurgerName] = useState(initialName);
  const nameCounter = useRef(1);
  const resolveBurgerName = () => {
    const custom = burgerName.trim();
    if (custom) return custom;
    const auto = `Customized Burger ${nameCounter.current}`;
    nameCounter.current += 1;
    return auto;
  };
  // Every burger step is multi-select — each step holds an array of
  // option ids in the exact order the guest picked them (the 3D stack
  // layers them in that same order). A reorder card's saved summary
  // re-selects every previous option.
  const [selections, setSelections] = useState(() =>
    selectionsFromSummary(CUSTOMIZE_BURGER.steps, initialSummary),
  );

  const burgerConfig = buildBurgerConfig(selections);
  const total = getTotalPrice(selections);
  const stepData = CUSTOMIZE_BURGER.steps.find((s) => s.step === step);

  // Close on Escape and lock page scrolling while the modal is open.
  useEffect(() => {
    const handleKeyDown = (event) => {
      // While the AuthModal is layered on top, Escape must only close
      // that one - not this customizer (the guest would lose their build).
      if (event.key === "Escape" && !escapeLocked) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose, escapeLocked]);

  const toggleOption = (stepKey, optionId) => {
    setSelections((current) => {
      const currentStep = getStep(stepKey);
      if (currentStep.type === "multi") {
        const list = current[stepKey] || [];
        return {
          ...current,
          [stepKey]: list.includes(optionId)
            ? list.filter((id) => id !== optionId)
            : [...list, optionId],
        };
      }
      return { ...current, [stepKey]: optionId };
    });
  };

  const isSelected = (stepKey, optionId) => {
    const currentStep = getStep(stepKey);
    if (currentStep.type === "multi") {
      return (selections[stepKey] || []).includes(optionId);
    }
    return (selections[stepKey] || currentStep.options[0].id) === optionId;
  };

  // Short summary of what the 3D burger is showing right now.
  const stageCaption =
    selections.fillings.length > 0
      ? selections.fillings
          .map((id) => getOption("fillings", id)?.name)
          .filter(Boolean)
          .join(" • ")
      : "Burger Buns";
  const extraCount =
    selections.vegetables.length +
    selections.cheese.length +
    selections.sauces.length;

  // At least one customized option must be picked before the build can be
  // added to the cart — an empty burger is not a valid order.
  const selectedCount = Object.values(selections).reduce(
    (sum, list) => sum + (list ? list.length : 0),
    0,
  );
  const canAddToCart = selectedCount > 0;

  return (
    <div className="bg-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="bg-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bg-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="bg-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* ---------- LEFT: 3D view ---------- */}
        <div className="bg-stage">
          <div className="bg-stage-top">
            <span className="bg-stage-caption">{stageCaption}</span>
            {extraCount > 0 && (
              <span className="bg-stage-extras">+{extraCount} extras</span>
            )}
          </div>
          <BurgerScene3D config={burgerConfig} />
          <span className="bg-stage-hint">⟲ drag to rotate</span>
        </div>
        {/* ---------- RIGHT: wizard ---------- */}
        <div className="bg-panel">
          <h2 id="bg-modal-title">Customize Your Burger</h2>

          <div className="bg-progress">
            <span className="bg-progress-label">
              Step {step} of {TOTAL_STEPS}
            </span>
            <div className="bg-dots">
              {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
                <span
                  key={index}
                  className={`bg-dot${index + 1 <= step ? " active" : ""}`}
                />
              ))}
            </div>
          </div>

          <div className="bg-body">
            {stepData ? (
              <>
                <h3 className="bg-step-title">{stepData.title}</h3>
                {stepData.subtitle ? (
                  <p className="bg-step-subtitle">{stepData.subtitle}</p>
                ) : null}
                {stepData.hasImage ? (
                  <div className="bg-options-grid">
                    {stepData.options.map((option) => (
                      <OptionCard
                        key={option.id}
                        stepData={stepData}
                        option={option}
                        selected={isSelected(stepData.key, option.id)}
                        onToggle={() => toggleOption(stepData.key, option.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-pills">
                    {stepData.options.map((option) => (
                      <Pill
                        key={option.id}
                        option={option}
                        selected={isSelected(stepData.key, option.id)}
                        onToggle={() => toggleOption(stepData.key, option.id)}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
              <div className="bg-name-field">
                <label htmlFor="burger-custom-name">
                  Write your customized burger name
                </label>
                <input
                  id="burger-custom-name"
                  type="text"
                  maxLength={40}
                  placeholder="Write your customized burger name"
                  value={burgerName}
                  onChange={(event) => setBurgerName(event.target.value)}
                />
              </div>
              <div className="bg-summary">
                <h3 className="bg-step-title">Summary</h3>
                <p className="bg-step-subtitle">
                  Your custom burger is ready — check your choices below.
                </p>
                {!canAddToCart && (
                  <p className="bg-required-note">
                    Please select at least one customized option (start with a
                    filling) before adding to the cart.
                  </p>
                )}
                {CUSTOMIZE_BURGER.steps.map((currentStep) => {
                  const chosenIds =
                    currentStep.type === "multi"
                      ? selections[currentStep.key] || []
                      : [selections[currentStep.key] || currentStep.options[0].id];
                  const chosen = chosenIds
                    .map((id) => getOption(currentStep.key, id))
                    .filter(Boolean);
                  if (!chosen.length) return null;
                  return (
                    <div className="bg-summary-group" key={currentStep.key}>
                      <h4>{currentStep.title}</h4>
                      {chosen.map((option) => (
                        <div className="bg-summary-row" key={option.id}>
                          <span>{option.name}</span>
                          <span>₱{option.price}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
              </>
            )}
          </div>

          <div className="bg-footer">
            <button
              type="button"
              className="bg-back"
              onClick={() => setStep((value) => Math.max(1, value - 1))}
              disabled={step === 1}
            >
              <ChevronLeft size={16} /> Back
            </button>
            <span className="bg-total">
              Total <strong>₱{total.toLocaleString()}</strong>
            </span>
            {step < TOTAL_STEPS ? (
              <button
                type="button"
                className="bg-next"
                onClick={() => setStep((value) => Math.min(TOTAL_STEPS, value + 1))}
              >
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                className="bg-add"
                disabled={!canAddToCart}
                title={
                  canAddToCart
                    ? "Add your customized burger to the cart"
                    : "Select at least one customized option first"
                }
                onClick={() =>
                  onRequireLogin({
                    ...burgerConfig,
                    name: resolveBurgerName(),
                    price: total,
                    summary: summarizeSelections(
                      CUSTOMIZE_BURGER.steps,
                      selections,
                      getOption,
                    ),
                  })
                }
              >
                <ShoppingCart size={16} /> Add to Cart
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default CustomizeBurgerModal;
