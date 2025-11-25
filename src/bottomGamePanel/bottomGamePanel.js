import { Stepper } from "../stepper/stepper.js";
import { createTooltip } from "../tooltip/tooltip.js";
import multiplierIconUrl from "../../assets/sprites/MultiplierIcon.svg";
import winChanceIconUrl from "../../assets/sprites/WinChanceIcon.svg";

const DEFAULT_TARGET_MULTIPLIER = 2;
const HOUSE_EDGE = 0.99;
const MIN_TARGET_MULTIPLIER = 1.01;
const MAX_TARGET_MULTIPLIER = 1_000_000;
const MIN_WIN_CHANCE = 0.000099;
const MAX_WIN_CHANCE = 98.01980198;

function resolveRoot(root) {
  const element = typeof root === "string" ? document.querySelector(root) : root;
  if (!element) {
    throw new Error("Bottom game panel mount element not found");
  }
  return element;
}

function formatTargetMultiplier(value) {
  return Number.isFinite(value) ? value.toFixed(2) : "";
}

function formatWinChance(value) {
  return Number.isFinite(value) ? value.toFixed(8) : "";
}

function sanitizeNumericInput(rawValue) {
  if (typeof rawValue !== "string") return rawValue;
  let sanitized = rawValue.replace(/[^0-9.]/g, "");
  const dotIndex = sanitized.indexOf(".");
  if (dotIndex !== -1) {
    const before = sanitized.slice(0, dotIndex + 1);
    const after = sanitized.slice(dotIndex + 1).replace(/\./g, "");
    sanitized = `${before}${after}`;
  }
  return sanitized;
}

function sanitizeWinChanceInput(rawValue) {
  const sanitized = sanitizeNumericInput(rawValue);
  const dotIndex = typeof sanitized === "string" ? sanitized.indexOf(".") : -1;

  if (dotIndex === -1 || typeof sanitized !== "string") {
    return sanitized;
  }

  const before = sanitized.slice(0, dotIndex + 1);
  const after = sanitized.slice(dotIndex + 1).slice(0, 8);

  return `${before}${after}`;
}

function roundToDecimals(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function computeWinChanceFromTarget(target) {
  return (HOUSE_EDGE * 100) / target;
}

function computeTargetFromWinChance(winChance) {
  return (HOUSE_EDGE * 100) / winChance;
}

function createValueBox({
  label,
  icon,
  step,
  format,
  sanitize,
  onCommit,
  ariaLabel,
  iconClass = "",
}) {
  const container = document.createElement("div");
  container.className = "game-panel-item";

  const labelEl = document.createElement("span");
  labelEl.className = "game-panel-label";
  labelEl.textContent = label;
  container.appendChild(labelEl);

  const valueWrapper = document.createElement("div");
  valueWrapper.className = "game-panel-value has-stepper";
  container.appendChild(valueWrapper);

  const input = document.createElement("input");
  input.type = "text";
  input.className = "game-panel-input";
  input.inputMode = "decimal";
  input.spellcheck = false;
  input.autocomplete = "off";
  input.setAttribute("aria-label", ariaLabel ?? label);
  valueWrapper.appendChild(input);

  const iconEl = document.createElement("img");
  iconEl.src = icon;
  iconEl.alt = "";
  iconEl.className = "game-panel-icon";
  if (iconClass) {
    iconEl.classList.add(iconClass);
  }
  valueWrapper.appendChild(iconEl);

  const stepper = new Stepper({
    upAriaLabel: `Increase ${label}`,
    downAriaLabel: `Decrease ${label}`,
    onStepUp: () => onCommit?.("step-up", step),
    onStepDown: () => onCommit?.("step-down", step),
  });
  valueWrapper.appendChild(stepper.element);

  input.addEventListener("focus", () => {
    setTimeout(() => input.select(), 0);
  });

  input.addEventListener("input", () => {
    const sanitized = sanitize(input.value);
    if (sanitized !== input.value) {
      const selection = input.selectionStart ?? sanitized.length;
      input.value = sanitized;
      const newPos = Math.max(0, Math.min(sanitized.length, selection - 1));
      try {
        input.setSelectionRange(newPos, newPos);
      } catch {}
    }
  });

  input.addEventListener("blur", () => onCommit?.("commit", input.value));
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onCommit?.("commit", input.value);
      input.blur();
    } else if (event.key === "Escape") {
      event.preventDefault();
      input.blur();
    }
  });

  function setValue(value) {
    input.value = format(value);
  }

  function setClickable(isClickable) {
    const clickable = Boolean(isClickable);
    input.disabled = !clickable;
    valueWrapper.classList.toggle("is-non-clickable", !clickable);
    stepper?.setClickable?.(clickable);
  }

  function setInvalid(isInvalid) {
    valueWrapper.classList.toggle("is-invalid", Boolean(isInvalid));
  }

  return {
    container,
    input,
    valueWrapper,
    setValue,
    setClickable,
    setInvalid,
  };
}

export function createBottomGamePanel({ root, onValuesChange = () => {} } = {}) {
  const host = resolveRoot(root ?? "#game");
  const panel = document.createElement("div");
  panel.className = "game-bottom-panel";

  const state = {
    targetMultiplier: DEFAULT_TARGET_MULTIPLIER,
    winChance: computeWinChanceFromTarget(DEFAULT_TARGET_MULTIPLIER),
  };

  let isSyncing = false;

  function validateTarget(value) {
    if (value < MIN_TARGET_MULTIPLIER) {
      return `Minimum is "${MIN_TARGET_MULTIPLIER.toFixed(2)}"`;
    }
    if (value > MAX_TARGET_MULTIPLIER) {
      return `Maximum is "${MAX_TARGET_MULTIPLIER.toFixed(0)}"`;
    }
    return "";
  }

  function validateWinChance(value) {
    if (value < MIN_WIN_CHANCE) {
      return `Minimum is "${MIN_WIN_CHANCE}"`;
    }
    if (value > MAX_WIN_CHANCE) {
      return `Maximum is "${MAX_WIN_CHANCE}"`;
    }
    return "";
  }

  function setInvalidState({ target = "", winChance = "" }, { showErrors = true } = {}) {
    const targetMessage = target || "";
    const winChanceMessage = winChance || "";
    const anyInvalid = Boolean(targetMessage || winChanceMessage);

    targetBox.setInvalid(anyInvalid);
    winChanceBox.setInvalid(anyInvalid);

    if (showErrors && targetMessage) {
      targetTooltip.show(targetMessage);
    } else {
      targetTooltip.hide();
    }

    if (showErrors && winChanceMessage) {
      winChanceTooltip.show(winChanceMessage);
    } else {
      winChanceTooltip.hide();
    }
  }

  function clearInvalidState() {
    targetBox.setInvalid(false);
    winChanceBox.setInvalid(false);
    targetTooltip.hide();
    winChanceTooltip.hide();
  }

  function commitTarget(
    rawValue,
    { showErrors = true, emit = true, allowSync = false } = {}
  ) {
    if (isSyncing && !allowSync) return;

    const numeric = Number(sanitizeNumericInput(`${rawValue ?? ""}`));
    const rounded = Number.isFinite(numeric) ? roundToDecimals(numeric, 2) : NaN;

    if (!Number.isFinite(rounded)) {
      targetBox.setValue(state.targetMultiplier);
      return;
    }

    const validationMessage = validateTarget(rounded);
    const isValid = !validationMessage;

    state.targetMultiplier = rounded;
    targetBox.setValue(rounded);

    if (isValid) {
      clearInvalidState();
      if (!allowSync) {
        const derivedWinChance = roundToDecimals(
          computeWinChanceFromTarget(rounded),
          8
        );
        isSyncing = true;
        commitWinChance(derivedWinChance, {
          emit: false,
          allowSync: true,
          showErrors,
        });
        isSyncing = false;
      }
    }

    setInvalidState({ target: isValid ? "" : validationMessage }, { showErrors });

    if (isValid && emit) {
      onValuesChange({ ...state });
    }
  }

  function commitWinChance(
    rawValue,
    { emit = true, allowSync = false, showErrors = true } = {}
  ) {
    if (isSyncing && !allowSync) return;

    const numeric = Number(sanitizeWinChanceInput(`${rawValue ?? ""}`));
    const rounded = Number.isFinite(numeric) ? roundToDecimals(numeric, 8) : NaN;

    if (!Number.isFinite(rounded)) {
      winChanceBox.setValue(state.winChance);
      return;
    }

    const validationMessage = validateWinChance(rounded);
    const isValid = !validationMessage;

    state.winChance = rounded;
    winChanceBox.setValue(rounded);

    if (isValid) {
      clearInvalidState();
      if (!allowSync) {
        const derivedMultiplier = roundToDecimals(
          computeTargetFromWinChance(rounded),
          2
        );
        isSyncing = true;
        commitTarget(derivedMultiplier, {
          emit: false,
          allowSync: true,
          showErrors,
        });
        isSyncing = false;
      }
    }

    setInvalidState({ winChance: isValid ? "" : validationMessage }, { showErrors });

    if (isValid && emit) {
      onValuesChange({ ...state });
    }
  }

  function handleTargetCommit(type, value) {
    if (type === "step-up") {
      commitTarget(state.targetMultiplier + value);
    } else if (type === "step-down") {
      commitTarget(state.targetMultiplier - value);
    } else {
      commitTarget(value);
    }
  }

  function handleWinChanceCommit(type, value) {
    if (type === "step-up") {
      commitWinChance(state.winChance + value);
    } else if (type === "step-down") {
      commitWinChance(state.winChance - value);
    } else {
      commitWinChance(value);
    }
  }

  const targetBox = createValueBox({
    label: "Target Multiplier",
    icon: multiplierIconUrl,
    step: 0.01,
    format: formatTargetMultiplier,
    sanitize: (value) => sanitizeNumericInput(`${value ?? ""}`),
    ariaLabel: "Target Multiplier",
    onCommit: handleTargetCommit,
    iconClass: "game-panel-icon--multiplier",
  });

  const winChanceBox = createValueBox({
    label: "Win Chance",
    icon: winChanceIconUrl,
    step: 0.01,
    format: formatWinChance,
    sanitize: (value) => sanitizeWinChanceInput(`${value ?? ""}`),
    ariaLabel: "Win Chance",
    onCommit: handleWinChanceCommit,
    iconClass: "game-panel-icon--win-chance",
  });

  const targetTooltip = createTooltip({
    className: "game-panel-value-tooltip",
    visibleClass: "is-visible",
    hideDelay: 3000,
  });
  targetBox.valueWrapper.appendChild(targetTooltip.element);

  const winChanceTooltip = createTooltip({
    className: "game-panel-value-tooltip",
    visibleClass: "is-visible",
    hideDelay: 3000,
  });
  winChanceBox.valueWrapper.appendChild(winChanceTooltip.element);

  targetBox.input.addEventListener("change", () => commitTarget(targetBox.input.value));
  winChanceBox.input.addEventListener("change", () => commitWinChance(winChanceBox.input.value));

  targetBox.input.addEventListener("focus", () => {
    targetTooltip.hide();
    winChanceTooltip.hide();
  });
  winChanceBox.input.addEventListener("focus", () => {
    targetTooltip.hide();
    winChanceTooltip.hide();
  });

  panel.append(targetBox.container, winChanceBox.container);
  host.appendChild(panel);

  targetBox.setValue(state.targetMultiplier);
  winChanceBox.setValue(state.winChance);

  onValuesChange({ ...state });

  function setControlsClickable(isClickable) {
    targetBox.setClickable(isClickable);
    winChanceBox.setClickable(isClickable);
  }

  function isValid() {
    return (
      !validateTarget(state.targetMultiplier) && !validateWinChance(state.winChance)
    );
  }

  function showValidationMessage() {
    const targetError = validateTarget(state.targetMultiplier);
    const winChanceError = validateWinChance(state.winChance);
    setInvalidState({ target: targetError, winChance: winChanceError });
  }

  function destroy() {
    panel.remove();
  }

  return {
    panel,
    getTargetMultiplier: () => state.targetMultiplier,
    getWinChance: () => state.winChance,
    setControlsClickable,
    isValid,
    showValidationMessage,
    destroy,
  };
}
