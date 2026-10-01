import { Check, ChevronLeft, ChevronRight, ShoppingCart, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  buildIceCreamConfig,
  CUSTOMIZE_ICE_CREAM,
  getOption,
  getStep,
  getTotalPrice,
} from "./customizeIceCreamData";
import { summarizeSelections } from "../../Customer/customerStore";
import IceCreamScene3D from "./IceCreamScene3D";
import "./CustomizeIceCreamModal.css";

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
// (flavor / toppings / syrup).
function OptionCard({ stepData, option, selected, onToggle }) {
  return (
    <button
      type="button"
      className={`ic-option-card${selected ? " selected" : ""}`}
      onClick={onToggle}
      aria-pressed={selected}
    >
      {stepData.hasImage && option.image ? (
        <img src={option.image} alt={option.name} />
      ) : null}
      <span className="ic-option-name">{option.name}</span>
      <span className="ic-option-price">₱{option.price}</span>
      {selected && (
        <span className="ic-option-check">
          <Check size={13} strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

// Pill choice for steps without images (kept for UI parity with the
// other customizers — every ice cream step currently has images).
function Pill({ option, selected, onToggle }) {
  return (
    <button
      type="button"
      className={`ic-pill${selected ? " selected" : ""}`}
      onClick={onToggle}
      aria-pressed={selected}
    >
      <span>{option.name}</span>
      {option.price > 0 ? <em>+₱{option.price}</em> : null}
    </button>
  );
}

function CustomizeIceCreamModal({
  onClose,
  onRequireLogin,
  escapeLocked = false,
  initialName = "",
  initialSummary = null,
}) {
  const [step, setStep] = useState(1);
  // guest's custom ice cream name; auto-numbered when left blank (for the
  // upcoming customer-account cart function)
  const [bowlName, setBowlName] = useState(initialName);
  const nameCounter = useRef(1);
  const resolveIceCreamName = () => {
    const custom = bowlName.trim();
    if (custom) return custom;
    const auto = `Customized Ice Cream ${nameCounter.current}`;
    nameCounter.current += 1;
    return auto;
  };
  // The flavor is single-select (holds one id); toppings and syrups are
  // multi-select (arrays of ids in the guest's selection order). A reorder
  // card's saved summary re-selects every previous option.
  const [selections, setSelections] = useState(() =>
    selectionsFromSummary(CUSTOMIZE_ICE_CREAM.steps, initialSummary),
  );

  const iceCreamConfig = buildIceCreamConfig(selections);
  const total = getTotalPrice(selections);
  const stepData = CUSTOMIZE_ICE_CREAM.steps.find((s) => s.step === step);

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

  // Short summary of what the 3D bowl is showing right now.
  const stageCaption =
    getOption("flavor", selections.flavor)?.name || "Ice Cream Bowl";
  const extraCount = selections.toppings.length + selections.syrup.length;

  return (
    <div className="ic-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="ic-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ic-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="ic-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* ---------- LEFT: 3D view ---------- */}
        <div className="ic-stage">
          <div className="ic-stage-top">
            <span className="ic-stage-caption">{stageCaption}</span>
            {extraCount > 0 && (
              <span className="ic-stage-extras">+{extraCount} extras</span>
            )}
          </div>
          <IceCreamScene3D config={iceCreamConfig} />
          <span className="ic-stage-hint">⟲ drag to rotate</span>
        </div>
        {/* ---------- RIGHT: wizard ---------- */}
        <div className="ic-panel">
          <h2 id="ic-modal-title">Customize Ice Cream</h2>

          <div className="ic-progress">
            <span className="ic-progress-label">
              Step {step} of {TOTAL_STEPS}
            </span>
            <div className="ic-dots">
              {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
                <span
                  key={index}
                  className={`ic-dot${index + 1 <= step ? " active" : ""}`}
                />
              ))}
            </div>
          </div>

          <div className="ic-body">
            {stepData ? (
              <>
                <h3 className="ic-step-title">{stepData.title}</h3>
                {stepData.subtitle ? (
                  <p className="ic-step-subtitle">{stepData.subtitle}</p>
                ) : null}
                {stepData.hasImage ? (
                  <div className="ic-options-grid">
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
                  <div className="ic-pills">
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
                <div className="ic-name-field">
                  <label htmlFor="icecream-custom-name">
                    Write your customized ice cream name
                  </label>
                  <input
                    id="icecream-custom-name"
                    type="text"
                    maxLength={40}
                    placeholder="Write your customized ice cream name"
                    value={bowlName}
                    onChange={(event) => setBowlName(event.target.value)}
                  />
                </div>
                <div className="ic-summary">
                  <h3 className="ic-step-title">Summary</h3>
                  <p className="ic-step-subtitle">
                    Your custom ice cream is ready — check your choices below.
                  </p>
                  {CUSTOMIZE_ICE_CREAM.steps.map((currentStep) => {
                    const chosenIds =
                      currentStep.type === "multi"
                        ? selections[currentStep.key] || []
                        : [
                            selections[currentStep.key] ||
                              currentStep.options[0].id,
                          ];
                    const chosen = chosenIds
                      .map((id) => getOption(currentStep.key, id))
                      .filter(Boolean);
                    if (!chosen.length) return null;
                    return (
                      <div className="ic-summary-group" key={currentStep.key}>
                        <h4>{currentStep.title}</h4>
                        {chosen.map((option) => (
                          <div className="ic-summary-row" key={option.id}>
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

          <div className="ic-footer">
            <button
              type="button"
              className="ic-back"
              onClick={() => setStep((value) => Math.max(1, value - 1))}
              disabled={step === 1}
            >
              <ChevronLeft size={16} /> Back
            </button>
            <span className="ic-total">
              Total <strong>₱{total.toLocaleString()}</strong>
            </span>
            {step < TOTAL_STEPS ? (
              <button
                type="button"
                className="ic-next"
                onClick={() =>
                  setStep((value) => Math.min(TOTAL_STEPS, value + 1))
                }
              >
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                className="ic-add"
                onClick={() =>
                  onRequireLogin({
                    ...iceCreamConfig,
                    name: resolveIceCreamName(),
                    price: total,
                    summary: summarizeSelections(
                      CUSTOMIZE_ICE_CREAM.steps,
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

export default CustomizeIceCreamModal;
