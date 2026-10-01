import { Check, ChevronLeft, ChevronRight, ShoppingCart, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  buildCheesecakeConfig,
  CUSTOMIZE_CHEESECAKE,
  getOption,
  getStep,
  getTotalPrice,
} from "./customizeCheesecakeData";
import { summarizeSelections } from "../../Customer/customerStore";
import CheesecakeScene3D from "./CheesecakeScene3D";
import "./CustomizeCheesecakeModal.css";

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

// Image card shown on steps that have pictures
// (cheesecake flavor / toppings / garnish).
function OptionCard({ stepData, option, selected, onToggle }) {
  return (
    <button
      type="button"
      className={`ck-option-card${selected ? " selected" : ""}`}
      onClick={onToggle}
      aria-pressed={selected}
    >
      {stepData.hasImage && option.image ? (
        <img src={option.image} alt={option.name} />
      ) : null}
      <span className="ck-option-name">{option.name}</span>
      <span className="ck-option-price">₱{option.price}</span>
      {((stepData.type === "multi" && selected) ||
        (stepData.type === "single" && selected)) && (
        <span className="ck-option-check">
          <Check size={13} strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

// Pill choice for steps without images (kept for UI parity with the
// other customizers — every cheesecake step currently has images).
function Pill({ option, selected, onToggle }) {
  return (
    <button
      type="button"
      className={`ck-pill${selected ? " selected" : ""}`}
      onClick={onToggle}
      aria-pressed={selected}
    >
      <span>{option.name}</span>
      {option.price > 0 ? <em>+₱{option.price}</em> : null}
    </button>
  );
}

function CustomizeCheesecakeModal({
  onClose,
  onRequireLogin,
  escapeLocked = false,
  initialName = "",
  initialSummary = null,
}) {
  const [step, setStep] = useState(1);
  // guest's custom cheesecake name; auto-numbered when left blank (for the
  // upcoming customer-account cart function)
  const [cakeName, setCakeName] = useState(initialName);
  const nameCounter = useRef(1);
  const resolveCheesecakeName = () => {
    const custom = cakeName.trim();
    if (custom) return custom;
    const auto = `Customized Cheesecake ${nameCounter.current}`;
    nameCounter.current += 1;
    return auto;
  };
  // The flavor is single-select (holds one id); toppings and garnishes
  // are multi-select (arrays of ids in the guest's selection order). A
  // reorder card's saved summary re-selects every previous option.
  const [selections, setSelections] = useState(() =>
    selectionsFromSummary(CUSTOMIZE_CHEESECAKE.steps, initialSummary),
  );

  const cheesecakeConfig = buildCheesecakeConfig(selections);
  const total = getTotalPrice(selections);
  const stepData = CUSTOMIZE_CHEESECAKE.steps.find((s) => s.step === step);

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

  // Short summary of what the 3D slice is showing right now.
  const stageCaption =
    getOption("cake", selections.cake)?.name || "Cheesecake Slice";
  const extraCount = selections.toppings.length + selections.garnishes.length;

  return (
    <div className="ck-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="ck-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ck-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="ck-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* ---------- LEFT: 3D view ---------- */}
        <div className="ck-stage">
          <div className="ck-stage-top">
            <span className="ck-stage-caption">{stageCaption}</span>
            {extraCount > 0 && (
              <span className="ck-stage-extras">+{extraCount} extras</span>
            )}
          </div>
          <CheesecakeScene3D config={cheesecakeConfig} />
          <span className="ck-stage-hint">⟲ drag to rotate</span>
        </div>
        {/* ---------- RIGHT: wizard ---------- */}
        <div className="ck-panel">
          <h2 id="ck-modal-title">Customize Cheesecake</h2>

          <div className="ck-progress">
            <span className="ck-progress-label">
              Step {step} of {TOTAL_STEPS}
            </span>
            <div className="ck-dots">
              {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
                <span
                  key={index}
                  className={`ck-dot${index + 1 <= step ? " active" : ""}`}
                />
              ))}
            </div>
          </div>

          <div className="ck-body">
            {stepData ? (
              <>
                <h3 className="ck-step-title">{stepData.title}</h3>
                {stepData.subtitle ? (
                  <p className="ck-step-subtitle">{stepData.subtitle}</p>
                ) : null}
                {stepData.hasImage ? (
                  <div className="ck-options-grid">
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
                  <div className="ck-pills">
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
              <div className="ck-name-field">
                <label htmlFor="cheesecake-custom-name">
                  Write your customized cheesecake name
                </label>
                <input
                  id="cheesecake-custom-name"
                  type="text"
                  maxLength={40}
                  placeholder="Write your customized cheesecake name"
                  value={cakeName}
                  onChange={(event) => setCakeName(event.target.value)}
                />
              </div>
              <div className="ck-summary">
                <h3 className="ck-step-title">Summary</h3>
                <p className="ck-step-subtitle">
                  Your custom cheesecake is ready — check your choices below.
                </p>
                {CUSTOMIZE_CHEESECAKE.steps.map((currentStep) => {
                  const chosenIds =
                    currentStep.type === "multi"
                      ? selections[currentStep.key] || []
                      : [selections[currentStep.key] || currentStep.options[0].id];
                  const chosen = chosenIds
                    .map((id) => getOption(currentStep.key, id))
                    .filter(Boolean);
                  if (!chosen.length) return null;
                  return (
                    <div className="ck-summary-group" key={currentStep.key}>
                      <h4>{currentStep.title}</h4>
                      {chosen.map((option) => (
                        <div className="ck-summary-row" key={option.id}>
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

          <div className="ck-footer">
            <button
              type="button"
              className="ck-back"
              onClick={() => setStep((value) => Math.max(1, value - 1))}
              disabled={step === 1}
            >
              <ChevronLeft size={16} /> Back
            </button>
            <span className="ck-total">
              Total <strong>₱{total.toLocaleString()}</strong>
            </span>
            {step < TOTAL_STEPS ? (
              <button
                type="button"
                className="ck-next"
                onClick={() => setStep((value) => Math.min(TOTAL_STEPS, value + 1))}
              >
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                className="ck-add"
                onClick={() =>
                  onRequireLogin({
                    ...cheesecakeConfig,
                    name: resolveCheesecakeName(),
                    price: total,
                    summary: summarizeSelections(
                      CUSTOMIZE_CHEESECAKE.steps,
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

export default CustomizeCheesecakeModal;
