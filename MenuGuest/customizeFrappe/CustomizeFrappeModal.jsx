import { Check, ChevronLeft, ChevronRight, ShoppingCart, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  buildFrappeConfig,
  CUSTOMIZE_FRAPPE,
  getOption,
  getStep,
  getTotalPrice,
} from "./customizeFrappeData";
import { summarizeSelections } from "../../Customer/customerStore";
import FrappeScene3D from "./FrappeScene3D";
import "./CustomizeFrappeModal.css";

const TOTAL_STEPS = 7; // 6 real steps + the final summary

// Rebuild the wizard's selections object from a saved order summary
// ([{ group: stepTitle, choice: optionName }, ...]) so "You Might Like"
// reorder cards can re-open the customizer with everything pre-chosen.
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

// Image card shown on steps that have pictures (flavor / toppings / ...).
function OptionCard({ stepData, option, selected, onToggle }) {
  return (
    <button
      type="button"
      className={`frappe-option-card${selected ? " selected" : ""}`}
      onClick={onToggle}
      aria-pressed={selected}
    >
      {stepData.hasImage && option.image ? (
        <img src={option.image} alt={option.name} />
      ) : null}
      <span className="frappe-option-name">{option.name}</span>
      <span className="frappe-option-price">₱{option.price}</span>
      {stepData.type === "multi" && selected && (
        <span className="frappe-option-check">
          <Check size={13} strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

// Pill choice for steps without images (cup size / sugar level).
function Pill({ option, selected, onToggle }) {
  return (
    <button
      type="button"
      className={`frappe-pill${selected ? " selected" : ""}`}
      onClick={onToggle}
      aria-pressed={selected}
    >
      <span>{option.name}</span>
      {option.price > 0 ? <em>+₱{option.price}</em> : null}
    </button>
  );
}

function CustomizeFrappeModal({
  onClose,
  onRequireLogin,
  escapeLocked = false,
  initialName = "",
  initialSummary = null,
}) {
  const [step, setStep] = useState(1);
  // guest's custom drink name; auto-numbered when left blank (for the
  // upcoming customer-account cart function)
  const [drinkName, setDrinkName] = useState(initialName);
  const nameCounter = useRef(1);
  const resolveDrinkName = () => {
    const custom = drinkName.trim();
    if (custom) return custom;
    const auto = `Customized Frappe ${nameCounter.current}`;
    nameCounter.current += 1;
    return auto;
  };
  // A reorder card's saved summary re-selects every option; otherwise the
  // wizard starts on the same defaults as before.
  const [selections, setSelections] = useState(() =>
    selectionsFromSummary(CUSTOMIZE_FRAPPE.steps, initialSummary),
  );

  const frappeConfig = buildFrappeConfig(selections);
  const total = getTotalPrice(selections);
  const stepData = CUSTOMIZE_FRAPPE.steps.find((s) => s.step === step);

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

  // Short summary of what the 3D cup is showing right now.
  const stageCaption = [
    getOption("flavor", selections.flavor)?.name,
    getOption("size", selections.size)?.name,
  ]
    .filter(Boolean)
    .join(" • ");
  const extraCount =
    selections.toppings.length +
    selections.drizzles.length +
    selections.addOns.length;

  return (
    <div className="frappe-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="frappe-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="frappe-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="frappe-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* ---------- LEFT: 3D view ---------- */}
        <div className="frappe-stage">
          <div className="frappe-stage-top">
            <span className="frappe-stage-caption">{stageCaption}</span>
            {extraCount > 0 && (
              <span className="frappe-stage-extras">+{extraCount} extras</span>
            )}
          </div>
          <FrappeScene3D config={frappeConfig} />
          <span className="frappe-stage-hint">⟲ drag to rotate</span>
        </div>
{/* ---------- RIGHT: wizard ---------- */}
        <div className="frappe-panel">
          <h2 id="frappe-modal-title">Customize Your Frappe</h2>

          <div className="frappe-progress">
            <span className="frappe-progress-label">
              Step {step} of {TOTAL_STEPS}
            </span>
            <div className="frappe-dots">
              {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
                <span
                  key={index}
                  className={`frappe-dot${index + 1 <= step ? " active" : ""}`}
                />
              ))}
            </div>
          </div>

          <div className="frappe-body">
            {stepData ? (
              <>
                <h3 className="frappe-step-title">{stepData.title}</h3>
                {stepData.subtitle ? (
                  <p className="frappe-step-subtitle">{stepData.subtitle}</p>
                ) : null}
                {stepData.hasImage ? (
                  <div className="frappe-options-grid">
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
                  <div className="frappe-pills">
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
              <div className="frappe-name-field">
                <label htmlFor="frappe-custom-name">
                  Write your customized frappe name
                </label>
                <input
                  id="frappe-custom-name"
                  type="text"
                  maxLength={40}
                  placeholder="Write your customized frappe name"
                  value={drinkName}
                  onChange={(event) => setDrinkName(event.target.value)}
                />
              </div>
              <div className="frappe-summary">
                <h3 className="frappe-step-title">Summary</h3>
                <p className="frappe-step-subtitle">
                  Your custom frappe is ready — check your choices below.
                </p>
                {CUSTOMIZE_FRAPPE.steps.map((currentStep) => {
                  const chosenIds =
                    currentStep.type === "multi"
                      ? selections[currentStep.key] || []
                      : [selections[currentStep.key] || currentStep.options[0].id];
                  const chosen = chosenIds
                    .map((id) => getOption(currentStep.key, id))
                    .filter(Boolean);
                  if (!chosen.length) return null;
                  return (
                    <div className="frappe-summary-group" key={currentStep.key}>
                      <h4>{currentStep.title}</h4>
                      {chosen.map((option) => (
                        <div className="frappe-summary-row" key={option.id}>
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

          <div className="frappe-footer">
            <button
              type="button"
              className="frappe-back"
              onClick={() => setStep((value) => Math.max(1, value - 1))}
              disabled={step === 1}
            >
              <ChevronLeft size={16} /> Back
            </button>
            <span className="frappe-total">
              Total <strong>₱{total.toLocaleString()}</strong>
            </span>
            {step < TOTAL_STEPS ? (
              <button
                type="button"
                className="frappe-next"
                onClick={() => setStep((value) => Math.min(TOTAL_STEPS, value + 1))}
              >
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                className="frappe-add"
                onClick={() =>
                  onRequireLogin({
                    ...frappeConfig,
                    name: resolveDrinkName(),
                    price: total,
                    summary: summarizeSelections(
                      CUSTOMIZE_FRAPPE.steps,
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

export default CustomizeFrappeModal;