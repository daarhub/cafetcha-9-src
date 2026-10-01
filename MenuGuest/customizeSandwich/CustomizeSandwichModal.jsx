import { Check, ChevronLeft, ChevronRight, ShoppingCart, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  buildSandwichConfig,
  CUSTOMIZE_SANDWICH,
  getOption,
  getStep,
  getTotalPrice,
} from "./customizeSandwichData";
import { summarizeSelections } from "../../Customer/customerStore";
import SandwichScene3D from "./SandwichScene3D";
import "./CustomizeSandwichModal.css";

const TOTAL_STEPS = 4; // 3 real steps + the final summary

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

// Image card shown on steps that have pictures (fillings / veg / sauces).
function OptionCard({ stepData, option, selected, onToggle }) {
  return (
    <button
      type="button"
      className={`sw-option-card${selected ? " selected" : ""}`}
      onClick={onToggle}
      aria-pressed={selected}
    >
      {stepData.hasImage && option.image ? (
        <img src={option.image} alt={option.name} />
      ) : null}
      <span className="sw-option-name">{option.name}</span>
      <span className="sw-option-price">₱{option.price}</span>
      {stepData.type === "multi" && selected && (
        <span className="sw-option-check">
          <Check size={13} strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

// Pill choice for steps without images (kept for UI parity with the
// frappe/tea customizers — every sandwich step currently has images).
function Pill({ option, selected, onToggle }) {
  return (
    <button
      type="button"
      className={`sw-pill${selected ? " selected" : ""}`}
      onClick={onToggle}
      aria-pressed={selected}
    >
      <span>{option.name}</span>
      {option.price > 0 ? <em>+₱{option.price}</em> : null}
    </button>
  );
}

function CustomizeSandwichModal({
  onClose,
  onRequireLogin,
  escapeLocked = false,
  initialName = "",
  initialSummary = null,
}) {
  const [step, setStep] = useState(1);
  // guest's custom sandwich name; auto-numbered when left blank (for the
  // upcoming customer-account cart function)
  const [sandwichName, setSandwichName] = useState(initialName);
  const nameCounter = useRef(1);
  const resolveSandwichName = () => {
    const custom = sandwichName.trim();
    if (custom) return custom;
    const auto = `Customized Sandwich ${nameCounter.current}`;
    nameCounter.current += 1;
    return auto;
  };
  // Every sandwich step is multi-select — each step holds an array of
  // option ids in the exact order the guest picked them (the 3D stack
  // layers them in that same order). A reorder card's saved summary
  // re-selects every previous option.
  const [selections, setSelections] = useState(() =>
    selectionsFromSummary(CUSTOMIZE_SANDWICH.steps, initialSummary),
  );

  const sandwichConfig = buildSandwichConfig(selections);
  const total = getTotalPrice(selections);
  const stepData = CUSTOMIZE_SANDWICH.steps.find((s) => s.step === step);

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

  // Short summary of what the 3D sandwich is showing right now.
  const stageCaption =
    selections.fillings.length > 0
      ? selections.fillings
          .map((id) => getOption("fillings", id)?.name)
          .filter(Boolean)
          .join(" • ")
      : "Toasted Sandwich Loaf";
  const extraCount =
    selections.vegetables.length + selections.sauces.length;

  // At least one customized option must be picked before the build can be
  // added to the cart — an empty sandwich is not a valid order.
  const selectedCount = Object.values(selections).reduce(
    (sum, list) => sum + (list ? list.length : 0),
    0,
  );
  const canAddToCart = selectedCount > 0;

  return (
    <div className="sw-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="sw-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sw-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="sw-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* ---------- LEFT: 3D view ---------- */}
        <div className="sw-stage">
          <div className="sw-stage-top">
            <span className="sw-stage-caption">{stageCaption}</span>
            {extraCount > 0 && (
              <span className="sw-stage-extras">+{extraCount} extras</span>
            )}
          </div>
          <SandwichScene3D config={sandwichConfig} />
          <span className="sw-stage-hint">⟲ drag to rotate</span>
        </div>
        {/* ---------- RIGHT: wizard ---------- */}
        <div className="sw-panel">
          <h2 id="sw-modal-title">Customize Your Sandwich</h2>

          <div className="sw-progress">
            <span className="sw-progress-label">
              Step {step} of {TOTAL_STEPS}
            </span>
            <div className="sw-dots">
              {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
                <span
                  key={index}
                  className={`sw-dot${index + 1 <= step ? " active" : ""}`}
                />
              ))}
            </div>
          </div>

          <div className="sw-body">
            {stepData ? (
              <>
                <h3 className="sw-step-title">{stepData.title}</h3>
                {stepData.subtitle ? (
                  <p className="sw-step-subtitle">{stepData.subtitle}</p>
                ) : null}
                {stepData.hasImage ? (
                  <div className="sw-options-grid">
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
                  <div className="sw-pills">
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
              <div className="sw-name-field">
                <label htmlFor="sandwich-custom-name">
                  Write your customized sandwich name
                </label>
                <input
                  id="sandwich-custom-name"
                  type="text"
                  maxLength={40}
                  placeholder="Write your customized sandwich name"
                  value={sandwichName}
                  onChange={(event) => setSandwichName(event.target.value)}
                />
              </div>
              <div className="sw-summary">
                <h3 className="sw-step-title">Summary</h3>
                <p className="sw-step-subtitle">
                  Your custom sandwich is ready — check your choices below.
                </p>
                {!canAddToCart && (
                  <p className="sw-required-note">
                    Please select at least one customized option (start with a
                    filling) before adding to the cart.
                  </p>
                )}
                {CUSTOMIZE_SANDWICH.steps.map((currentStep) => {
                  const chosenIds =
                    currentStep.type === "multi"
                      ? selections[currentStep.key] || []
                      : [selections[currentStep.key] || currentStep.options[0].id];
                  const chosen = chosenIds
                    .map((id) => getOption(currentStep.key, id))
                    .filter(Boolean);
                  if (!chosen.length) return null;
                  return (
                    <div className="sw-summary-group" key={currentStep.key}>
                      <h4>{currentStep.title}</h4>
                      {chosen.map((option) => (
                        <div className="sw-summary-row" key={option.id}>
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

          <div className="sw-footer">
            <button
              type="button"
              className="sw-back"
              onClick={() => setStep((value) => Math.max(1, value - 1))}
              disabled={step === 1}
            >
              <ChevronLeft size={16} /> Back
            </button>
            <span className="sw-total">
              Total <strong>₱{total.toLocaleString()}</strong>
            </span>
            {step < TOTAL_STEPS ? (
              <button
                type="button"
                className="sw-next"
                onClick={() => setStep((value) => Math.min(TOTAL_STEPS, value + 1))}
              >
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                className="sw-add"
                disabled={!canAddToCart}
                title={
                  canAddToCart
                    ? "Add your customized sandwich to the cart"
                    : "Select at least one customized option first"
                }
                onClick={() =>
                  onRequireLogin({
                    ...sandwichConfig,
                    name: resolveSandwichName(),
                    price: total,
                    summary: summarizeSelections(
                      CUSTOMIZE_SANDWICH.steps,
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

export default CustomizeSandwichModal;
