import { sound } from "@pixi/sound";

import betButtonUrl from "../../assets/sounds/BetButton.wav";
import outcomeRevealUrl from "../../assets/sounds/OutcomeReveal.wav";
import winUrl from "../../assets/sounds/Win.wav";
import lostUrl from "../../assets/sounds/Lost.wav";

const SOUND_KEYS = {
  betButton: "bet-button",
  outcomeReveal: "outcome-reveal",
  win: "win",
  lost: "lost",
};

function ensureSound(key, url) {
  if (sound.find?.(key)) return;
  sound.add(key, {
    url,
    preload: true,
  });
}

export function loadGameSounds() {
  ensureSound(SOUND_KEYS.betButton, betButtonUrl);
  ensureSound(SOUND_KEYS.outcomeReveal, outcomeRevealUrl);
  ensureSound(SOUND_KEYS.win, winUrl);
  ensureSound(SOUND_KEYS.lost, lostUrl);
}

export function playBetButtonSound() {
  sound.play(SOUND_KEYS.betButton);
}

export function playOutcomeRevealSound() {
  sound.play(SOUND_KEYS.outcomeReveal);
}

export function playWinSound() {
  sound.play(SOUND_KEYS.win);
}

export function playLostSound() {
  sound.play(SOUND_KEYS.lost);
}
