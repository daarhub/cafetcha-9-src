import { Check, ChevronLeft, ChevronRight, ShoppingCart, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  buildTeaConfig,
  CUSTOMIZE_TEA,
  getOption,
  getStep,
  getTotalPrice,
} from "./customizeTeaData";
import { summarizeSelections } from "../../Customer/customerStore";
import TeaScene3D from "./TeaScene3D";
import "./CustomizeTeaModal.css";

const TOTAL_STEPS = 6; // 5 real steps + the final summary

// Rebuild the wizard's selections object from a saved order summary so
// "You Might Like" reorder cards can re-open the customizer pre-chosen.
// Groups match colon-insensitively — old summaries were saved with step
// titles that ended in a colon (e.g. "Add-ons:") before those were cleaned.
const cleanGroupLabel = (label) => String(label || "").replace(/:\s*$/, "");

const selectionsFromSummary = (steps, summary) => {
  const result = {};
  steps.forEach((step) => {
    result[step.key] = step.type === "multi" ? [] : step.options[0].id;
  });
  (summary || []).forEach((entry) => {
    const step = steps.find(
      (candidate) =>
        cleanGroupLabel(candidate.title) === cleanGroupLabel(entry.group),
    );
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

// Image card shown on steps that have pictures (tea / boba / add-ons).
function OptionCard({ stepData, option, selected, onToggle }) {
  return (
    <button
      type="button"
      className={`tea-option-card${selected ? " selected" : ""}`}
      onClick={onToggle}
      aria-pressed={selected}
    >
      {stepData.hasImage && option.image ? (
        <img src={option.image} alt={option.name} />
      ) : null}
      <span className="tea-option-name">{option.name}</span>
      <span className="tea-option-price">₱{option.price}</span>
      {stepData.type === "multi" && selected && (
        <span className="tea-option-check">
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
      className={`tea-pill${selected ? " selected" : ""}`}
      onClick={onToggle}
      aria-pressed={selected}
    >
      <span>{option.name}</span>
      {option.price > 0 ? <em>+₱{option.price}</em> : null}
    </button>
  );
}

function CustomizeTeaModal({
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
    const auto = `Customized Tea ${nameCounter.current}`;
    nameCounter.current += 1;
    return auto;
  };
  // A reorder card's saved summary re-selects every option; otherwise the
  // wizard starts on the same defaults as before.
  const [selections, setSelections] = useState(() =>
    selectionsFromSummary(CUSTOMIZE_TEA.steps, initialSummary),
  );

  const teaConfig = buildTeaConfig(selections);
  const total = getTotalPrice(selections);
  const stepData = CUSTOMIZE_TEA.steps.find((s) => s.step === step);

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
    getOption("tea", selections.tea)?.name,
    getOption("size", selections.size)?.name,
  ]
    .filter(Boolean)
    .join(" • ");
  const extraCount =
    selections.boba.length +
    selections.addOns.length;

  return (
    <div className="tea-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="tea-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tea-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="tea-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* ---------- LEFT: 3D view ---------- */}
        <div className="tea-stage">
          <div className="tea-stage-top">
            <span className="tea-stage-caption">{stageCaption}</span>
            {extraCount > 0 && (
              <span className="tea-stage-extras">+{extraCount} extras</span>
            )}
          </div>
          <TeaScene3D config={teaConfig} />
          <span className="tea-stage-hint">⟲ drag to rotate</span>
        </div>
{/* ---------- RIGHT: wizard ---------- */}
        <div className="tea-panel">
          <h2 id="tea-modal-title">Customize Your Tea</h2>

          <div className="tea-progress">
            <span className="tea-progress-label">
              Step {step} of {TOTAL_STEPS}
            </span>
            <div className="tea-dots">
              {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
                <span
                  key={index}
                  className={`tea-dot${index + 1 <= step ? " active" : ""}`}
                />
              ))}
            </div>
          </div>

          <div className="tea-body">
            {stepData ? (
              <>
                <h3 className="tea-step-title">{stepData.title}</h3>
                {stepData.subtitle ? (
                  <p className="tea-step-subtitle">{stepData.subtitle}</p>
                ) : null}
                {stepData.hasImage ? (
                  <div className="tea-options-grid">
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
                  <div className="tea-pills">
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
              <div className="tea-name-field">
                <label htmlFor="tea-custom-name">
                  Write your customized tea-based name
                </label>
                <input
                  id="tea-custom-name"
                  type="text"
                  maxLength={40}
                  placeholder="Write your customized tea-based name"
                  value={drinkName}
                  onChange={(event) => setDrinkName(event.target.value)}
                />
              </div>
              <div className="tea-summary">
                <h3 className="tea-step-title">Summary</h3>
                <p className="tea-step-subtitle">
                  Your custom tea is ready — check your choices below.
                </p>
                {CUSTOMIZE_TEA.steps.map((currentStep) => {
                  const chosenIds =
                    currentStep.type === "multi"
                      ? selections[currentStep.key] || []
                      : [selections[currentStep.key] || currentStep.options[0].id];
                  const chosen = chosenIds
                    .map((id) => getOption(currentStep.key, id))
                    .filter(Boolean);
                  if (!chosen.length) return null;
                  return (
                    <div className="tea-summary-group" key={currentStep.key}>
                      <h4>{currentStep.title}</h4>
                      {chosen.map((option) => (
                        <div className="tea-summary-row" key={option.id}>
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

          <div className="tea-footer">
            <button
              type="button"
              className="tea-back"
              onClick={() => setStep((value) => Math.max(1, value - 1))}
              disabled={step === 1}
            >
              <ChevronLeft size={16} /> Back
            </button>
            <span className="tea-total">
              Total <strong>₱{total.toLocaleString()}</strong>
            </span>
            {step < TOTAL_STEPS ? (
              <button
                type="button"
                className="tea-next"
                onClick={() => setStep((value) => Math.min(TOTAL_STEPS, value + 1))}
              >
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                className="tea-add"
                onClick={() =>
                  onRequireLogin({
                    ...teaConfig,
                    name: resolveDrinkName(),
                    price: total,
                    summary: summarizeSelections(
                      CUSTOMIZE_TEA.steps,
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

export default CustomizeTeaModal;