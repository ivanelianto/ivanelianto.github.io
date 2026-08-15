const STORAGE_FILES = {
  players: 'players.json',
  schedules: 'schedules.json',
  matches: 'matches.json',
  payments: 'payments.json',
};

function parseStoredJSON(str, fallback) {
  try {
    const value = JSON.parse(str);
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

// Static GitHub Pages friendly storage. The UI speaks in JSON file names,
// while the browser keeps the records in localStorage.
export const storage = {
  async loadAll() {
    const out = {};
    for (const [key, filename] of Object.entries(STORAGE_FILES)) {
      const raw = localStorage.getItem(`bbmm:${filename}`);
      const records = raw ? parseStoredJSON(raw, []) : [];
      out[key] = Array.isArray(records) ? records : [];
    }
    return out;
  },

  async saveAll({ players, schedules, matches, payments }) {
    localStorage.setItem(`bbmm:${STORAGE_FILES.players}`, JSON.stringify(players ?? [], null, 2));
    localStorage.setItem(`bbmm:${STORAGE_FILES.schedules}`, JSON.stringify(schedules ?? [], null, 2));
    localStorage.setItem(`bbmm:${STORAGE_FILES.matches}`, JSON.stringify(matches ?? [], null, 2));
    localStorage.setItem(`bbmm:${STORAGE_FILES.payments}`, JSON.stringify(payments ?? [], null, 2));
  },

  async resetAll() {
    for (const filename of Object.values(STORAGE_FILES)) {
      localStorage.removeItem(`bbmm:${filename}`);
    }
  },
};

export function seedStorageIfEmpty(players) {
  const hasPlayers = localStorage.getItem(`bbmm:${STORAGE_FILES.players}`);
  if (hasPlayers) return;

  localStorage.setItem(`bbmm:${STORAGE_FILES.players}`, JSON.stringify(players ?? [], null, 2));
  localStorage.setItem(`bbmm:${STORAGE_FILES.schedules}`, JSON.stringify([], null, 2));
  localStorage.setItem(`bbmm:${STORAGE_FILES.matches}`, JSON.stringify([], null, 2));
  localStorage.setItem(`bbmm:${STORAGE_FILES.payments}`, JSON.stringify([], null, 2));
}
