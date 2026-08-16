export const SOUNDS = {
  DEAL_CARD: "/sounds/deal-card.mp3",
  TAKE_CARD: "/sounds/take-card.mp3",
  TAKE_TOKEN: "/sounds/take-token.mp3",
  WIN: "/sounds/win.mp3",
  LOSE: "/sounds/lose.mp3",
  NOBLE_VISIT_1: "/sounds/noble-visit-1.mp3",
  NOBLE_VISIT_2: "/sounds/noble-visit-2.mp3",
  YOUR_TURN: "/sounds/your-turn.mp3",
};

export const playSound = (file, volume = 1) => {
  const audio = new Audio(file);
  audio.currentTime = 0;
  audio.volume = volume;
  audio.play().catch(() => {});
};