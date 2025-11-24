import { createGame } from "./game/game.js";
import { ControlPanel } from "./controlPanel/controlPanel.js";

let game;
let controlPanel;
let roundActive = false;

function formatCurrency(value) {
  const numeric = Number(value);
  const normalized = Number.isFinite(numeric) ? numeric : 0;
  return `$${normalized.toFixed(2)}`;
}

function syncDisplays({ betAmount = 0, profitAmount = 0, multiplier = 1 }) {
  controlPanel?.setBetAmountDisplay?.(formatCurrency(betAmount));
  controlPanel?.setProfitOnWinDisplay?.(formatCurrency(profitAmount));
  controlPanel?.setTotalProfitMultiplier?.(multiplier);
  controlPanel?.setProfitValue?.(profitAmount.toFixed(8));
}

function resetRoundState() {
  roundActive = false;
  controlPanel?.setBetButtonState?.("clickable");
  syncDisplays({ betAmount: controlPanel?.getBetValue?.() ?? 0, profitAmount: 0, multiplier: 1 });
  game?.reset?.();
}

async function handleBetButtonClick() {
  const betAmount = controlPanel?.getBetValue?.() ?? 0;

  if (roundActive) return;

  roundActive = true;
  controlPanel?.setBetButtonState?.("non-clickable");
  syncDisplays({ betAmount, profitAmount: betAmount, multiplier: 1 });

  try {
    await game?.playDemoRound?.({ amount: betAmount });
  } finally {
    roundActive = false;
    controlPanel?.setBetButtonState?.("clickable");
  }
}

function handleRandomPickClick() {
  console.debug("Random pick requested - no game logic implemented yet.");
}

function handleStartAutobetClick() {
  console.debug("Auto bet toggle requested - no game logic implemented yet.");
}

function bindControlPanelEvents() {
  controlPanel.addEventListener("bet", handleBetButtonClick);
  controlPanel.addEventListener("randompick", handleRandomPickClick);
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
  controlPanel = new ControlPanel("#control-panel", {
    gameName: "Limbo",
    minesLabel: "Options Input",
    gemsLabel: "Options Display",
  });

  bindControlPanelEvents();
  syncDisplays({ betAmount: controlPanel.getBetValue?.() ?? 0, profitAmount: 0, multiplier: 1 });

  game = await createGame("#game", {});
  game?.setAnimationsEnabled?.(controlPanel.getAnimationsEnabled?.());

  resetRoundState();
})();
