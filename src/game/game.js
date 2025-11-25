import { Application, Container, Text, TextStyle } from "pixi.js";

const DEFAULT_BACKGROUND = 0x091b26;
const MIN_MULTIPLIER = 1.01;
const MIN_DISPLAY_MULTIPLIER = 1;
const MAX_MULTIPLIER = 1_000_000;
const HOUSE_EDGE = 0.99;

function getRendererResolution() {
  if (typeof window === "undefined") {
    return 1;
  }

  const dpr = window.devicePixelRatio ?? 1;
  return Math.max(1, dpr);
}

function resolveRoot(mount) {
  const root = typeof mount === "string" ? document.querySelector(mount) : mount;
  if (!root) {
    throw new Error("createGame: mount element not found");
  }
  return root;
}

function measureRootSize(root, fallbackSize) {
  const rect = root.getBoundingClientRect();
  const width = Math.max(1, rect.width || root.clientWidth || fallbackSize);
  const height = Math.max(1, rect.height || root.clientHeight || width);
  return { width, height };
}

export async function createGame(mount, opts = {}) {
  const root = resolveRoot(mount);
  const initialSize = Math.max(1, opts.size ?? 400);
  const backgroundColor = opts.backgroundColor ?? DEFAULT_BACKGROUND;
  const fontFamily =
    opts.fontFamily ?? "Inter, system-ui, -apple-system, Segoe UI, Arial";

  root.style.position = root.style.position || "relative";
  root.style.aspectRatio = root.style.aspectRatio || "1 / 1";
  if (!root.style.width && !root.style.height) {
    root.style.width = "100%";
  }
  if (!root.style.maxWidth) {
    root.style.maxWidth = "100%";
  }

  const app = new Application();
  const { width: startWidth, height: startHeight } = measureRootSize(
    root,
    initialSize
  );

  await app.init({
    background: backgroundColor,
    width: startWidth,
    height: startHeight,
    antialias: true,
    resolution: getRendererResolution(),
    autoDensity: true,
  });

  root.innerHTML = "";
  root.appendChild(app.canvas);

  const stage = new Container();
  app.stage.addChild(stage);

  const outcomeText = new Text({
    text: "1.00x",
    style: new TextStyle({
      fill: "#ffffff",
      fontSize: 72,
      fontWeight: "700",
      fontFamily,
      dropShadow: true,
      dropShadowColor: "#000000",
      dropShadowBlur: 8,
      dropShadowDistance: 4,
    }),
  });
  outcomeText.anchor.set(0.5);
  stage.addChild(outcomeText);

  const state = {
    roundActive: false,
    betAmount: 0,
    result: null,
    displayedMultiplier: 1,
    animation: null,
  };

  function formatMultiplier(value) {
    const precision = value >= 1000 ? 2 : value >= 10 ? 3 : 2;
    return `${value.toFixed(precision)}x`;
  }

  function setOutcomeDisplay(value) {
    const normalized = Math.max(
      MIN_DISPLAY_MULTIPLIER,
      Math.min(value, MAX_MULTIPLIER)
    );
    outcomeText.text = formatMultiplier(normalized);
    state.displayedMultiplier = normalized;
  }

  function generateDemoMultiplier() {
    const r = Math.random();
    const raw = HOUSE_EDGE / (1 - r);
    return Math.max(MIN_MULTIPLIER, Math.min(raw, MAX_MULTIPLIER));
  }

  function animateToMultiplier(target, { durationMs = 1000 } = {}) {
    const start = performance.now();
    const initial = state.displayedMultiplier ?? MIN_MULTIPLIER;
    const clampedTarget = Math.max(MIN_MULTIPLIER, Math.min(target, MAX_MULTIPLIER));
    const wasStopped = !app.ticker.started;

    if (state.animation) {
      app.ticker.remove(state.animation);
      state.animation = null;
    }

    return new Promise((resolve) => {
      const tick = () => {
        const elapsed = performance.now() - start;
        const t = Math.min(1, elapsed / durationMs);
        const nextValue = initial + (clampedTarget - initial) * t;
        setOutcomeDisplay(nextValue);
        if (t >= 1) {
          app.ticker.remove(tick);
          state.animation = null;
          if (wasStopped) {
            app.ticker.stop();
          }
          resolve();
        }
      };

      state.animation = tick;
      if (wasStopped) {
        app.ticker.start();
      }
      app.ticker.add(tick);
    });
  }

  function layout() {
    const { width, height } = measureRootSize(root, initialSize);
    app.renderer.resize(width, height);
    outcomeText.position.set(width / 2, height / 2);
  }

  function reset() {
    state.roundActive = false;
    state.betAmount = 0;
    state.result = null;
    if (state.animation) {
      app.ticker.remove(state.animation);
      state.animation = null;
    }
    setOutcomeDisplay(1);
  }

  async function playDemoRound({ amount = 0 } = {}) {
    state.roundActive = true;
    state.betAmount = Number(amount) || 0;
    state.result = null;

    setOutcomeDisplay(1);

    const resultMultiplier = generateDemoMultiplier();
    await animateToMultiplier(resultMultiplier);

    state.roundActive = false;
    state.result = resultMultiplier;
    return resultMultiplier;
  }

  function setAnimationsEnabled(enabled) {
    app.ticker.stop();
    if (enabled !== false) {
      app.ticker.start();
    }
  }

  function destroy() {
    window.removeEventListener("resize", layout);
    app.destroy(true);
    if (app.canvas?.parentNode === root) {
      root.removeChild(app.canvas);
    }
  }

  window.addEventListener("resize", layout);
  layout();

  return {
    app,
    reset,
    destroy,
    playDemoRound,
    setAnimationsEnabled,
    getState: () => ({ ...state }),
  };
}
