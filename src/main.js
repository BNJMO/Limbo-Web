import { createGame } from "./game/game.js";
import { ControlPanel } from "./controlPanel/controlPanel.js";
import { createBottomGamePanel } from "./bottomGamePanel/bottomGamePanel.js";
import {
  loadGameSounds,
  playBetButtonSound,
  playLostSound,
  playWinSound,
} from "./sound/soundManager.js";

let game;
let controlPanel;
let bottomPanel;
let roundActive = false;
let autobetActive = false;
let autobetStopRequested = false;
const AUTOBET_DELAY_MS = 1000;

function formatCurrency(value) {
  const numeric = Number(value);
  const normalized = Number.isFinite(numeric) ? numeric : 0;
  return `$${normalized.toFixed(2)}`;
}

function formatMultiplierLabel(value) {
  const numeric = Number(value);
  const normalized = Number.isFinite(numeric) ? numeric : 0;
  return `${normalized.toFixed(2)}x`;
}

function syncDisplays({ betAmount = 0, profitAmount = 0, multiplier = 1 }) {
  const targetMultiplier = bottomPanel?.getTargetMultiplier?.() ?? 1;
  const potentialProfit = betAmount * Math.max(0, targetMultiplier - 1);
  controlPanel?.setBetAmountDisplay?.(formatCurrency(betAmount));
  controlPanel?.setProfitOnWinDisplay?.(formatCurrency(potentialProfit));
  controlPanel?.setTotalProfitMultiplier?.(multiplier);
  const displayedProfit = Number.isFinite(profitAmount)
    ? profitAmount
    : potentialProfit;
  controlPanel?.setProfitValue?.(displayedProfit.toFixed(8));
}

function resetRoundState() {
  roundActive = false;
  controlPanel?.setBetButtonState?.("clickable");
  bottomPanel?.setControlsClickable?.(true);
  syncDisplays({
    betAmount: controlPanel?.getBetValue?.() ?? 0,
    profitAmount: 0,
    multiplier: 1,
  });
  game?.reset?.();
}

const wait = (duration) =>
  new Promise((resolve) => {
    setTimeout(resolve, duration);
  });

async function playRound() {
  if (roundActive) return false;

  if (!bottomPanel?.isValid?.()) {
    bottomPanel?.showValidationMessage?.();
    return false;
  }

  playBetButtonSound();
  const betAmount = controlPanel?.getBetValue?.() ?? 0;

  roundActive = true;
  controlPanel?.setBetButtonState?.("non-clickable");
  bottomPanel?.setControlsClickable?.(false);
  syncDisplays({ betAmount, profitAmount: 0, multiplier: 1 });

  try {
    const result = await game?.playDemoRound?.({ amount: betAmount });
    const targetMultiplier = bottomPanel?.getTargetMultiplier?.() ?? 1;
    const isWin = Number(result) >= targetMultiplier;
    const outcomeColor = isWin ? "#00E701" : "#E9113C";
    game?.setOutcomeColor?.(outcomeColor);
    const netProfit = isWin
      ? betAmount * Math.max(0, targetMultiplier - 1)
      : -betAmount;
    syncDisplays({ betAmount, profitAmount: netProfit, multiplier: targetMultiplier });
    game?.addBetHistoryEntry?.({
      label: formatMultiplierLabel(result),
      isWin,
    });
    if (isWin) {
      playWinSound();
    } else {
      playLostSound();
    }
  } finally {
    roundActive = false;
    controlPanel?.setBetButtonState?.("clickable");
    bottomPanel?.setControlsClickable?.(true);
  }
  return true;
}

async function handleBetButtonClick() {
  await playRound();
}

async function startAutobetLoop() {
  autobetActive = true;
  autobetStopRequested = false;
  controlPanel?.setAutoStartButtonMode?.("finish");
  controlPanel?.setAutoStartButtonState?.("clickable");

  while (autobetActive && !autobetStopRequested) {
    await wait(AUTOBET_DELAY_MS);
    if (autobetStopRequested) {
      break;
    }
    const started = await playRound();
    if (!started) {
      autobetStopRequested = true;
    }
  }

  autobetActive = false;
  autobetStopRequested = false;
  controlPanel?.setAutoStartButtonMode?.("start");
  controlPanel?.setAutoStartButtonState?.("clickable");
}

function handleStartAutobetClick() {
  if (autobetActive) {
    autobetStopRequested = true;
    controlPanel?.setAutoStartButtonState?.("non-clickable");
    return;
  }

  if (roundActive) return;
  startAutobetLoop();
}

function bindControlPanelEvents() {
  controlPanel.addEventListener("bet", handleBetButtonClick);
  controlPanel.addEventListener("startautobet", handleStartAutobetClick);
  controlPanel.addEventListener("animationschange", (event) => {
    const enabled = Boolean(event.detail?.enabled);
    game?.setAnimationsEnabled?.(enabled);
  });
  controlPanel.addEventListener("betvaluechange", (event) => {
    const betAmount = event.detail?.numericValue ?? event.detail?.value ?? 0;
    if (!roundActive) {
      syncDisplays({ betAmount, profitAmount: 0, multiplier: 1 });
    }
  });
}

(async () => {
  loadGameSounds();

  controlPanel = new ControlPanel("#control-panel", {
    gameName: "Limbo",
    minesLabel: "Options Input",
    gemsLabel: "Options Display",
  });

  bindControlPanelEvents();
  syncDisplays({
    betAmount: controlPanel.getBetValue?.() ?? 0,
    profitAmount: 0,
    multiplier: 1,
  });

  game = await createGame("#game", {});
  game?.setAnimationsEnabled?.(controlPanel.getAnimationsEnabled?.());

  bottomPanel = createBottomGamePanel({
    root: "#game",
    onValuesChange: () => {
      const betAmount = controlPanel?.getBetValue?.() ?? 0;
      if (!roundActive) {
        syncDisplays({ betAmount, profitAmount: 0, multiplier: 1 });
      }
    },
  });

  resetRoundState();
})();
