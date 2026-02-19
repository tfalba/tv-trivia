import type { Player } from "@tv-trivia/shared";

export const roundStorageKey = "tv-trivia:round-number";
export const currentPlayerIndexStorageKey = "tv-trivia:current-player-index";

export function getSavedRoundNumber(): number {
  if (typeof window === "undefined") {
    return 1;
  }
  const raw = window.localStorage.getItem(roundStorageKey);
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isInteger(parsed) && parsed >= 1) {
    return parsed;
  }
  return 1;
}

export function saveRoundNumber(round: number): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(roundStorageKey, String(Math.max(1, Math.floor(round))));
}

export function getSavedCurrentPlayerIndex(): number {
  if (typeof window === "undefined") {
    return 0;
  }
  const raw = window.localStorage.getItem(currentPlayerIndexStorageKey);
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isInteger(parsed) && parsed >= 0) {
    return parsed;
  }
  return 0;
}

export function saveCurrentPlayerIndex(index: number): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(currentPlayerIndexStorageKey, String(Math.max(0, Math.floor(index))));
}

export function hasRoundWinner(players: Player[]): boolean {
  return players.some((player) => player.score >= 1000);
}

export function startNextRound(players: Player[]): Player[] {
  const nextRound = getSavedRoundNumber() + 1;
  saveRoundNumber(nextRound);
  saveCurrentPlayerIndex(0);
  return players.map((player) => ({ ...player, score: 0 }));
}
