import type { Player } from "@tv-trivia/shared";

export const playerStorageKey = "tv-trivia:players";

function defaultPlayers(): Player[] {
  return [
    { id: "player-1", name: "Player 1", score: 0 },
    { id: "player-2", name: "Player 2", score: 0 },
  ];
}

function isPlayer(value: unknown): value is Player {
  if (!value || typeof value !== "object") {
    return false;
  }
  const maybe = value as Record<string, unknown>;
  return (
    typeof maybe.id === "string" &&
    typeof maybe.name === "string" &&
    typeof maybe.score === "number"
  );
}

export function getSavedPlayers(): Player[] {
  if (typeof window === "undefined") {
    return defaultPlayers();
  }

  try {
    const raw = window.localStorage.getItem(playerStorageKey);
    if (!raw) {
      return defaultPlayers();
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const players = parsed.filter(isPlayer);
      if (players.length > 0) {
        return players;
      }
    }
  } catch {
    // Ignore malformed local state and fall back to defaults.
  }
  return defaultPlayers();
}

export function savePlayers(players: Player[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(playerStorageKey, JSON.stringify(players));
}
