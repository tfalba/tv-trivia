import type { Player } from "@tv-trivia/shared";

export const roundStorageKey = "tv-trivia:round-number";
export const currentPlayerIndexStorageKey = "tv-trivia:current-player-index";
export const usedQuestionIdsByDecadeStorageKey = "tv-trivia:used-question-ids-by-decade";

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

function shufflePlayers(players: Player[]): Player[] {
  const shuffled = [...players];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = shuffled[index];
    shuffled[index] = shuffled[swapIndex];
    shuffled[swapIndex] = current;
  }
  return shuffled;
}

export function startNextRoundWithRandomRotation(players: Player[]): Player[] {
  const resetPlayers = shufflePlayers(players).map((player) => ({ ...player, score: 0 }));
  if (resetPlayers.length <= 1) {
    return startNextRound(resetPlayers);
  }

  const randomStartIndex = Math.floor(Math.random() * resetPlayers.length);
  const rotatedPlayers = [
    ...resetPlayers.slice(randomStartIndex),
    ...resetPlayers.slice(0, randomStartIndex),
  ];

  const nextRound = getSavedRoundNumber() + 1;
  saveRoundNumber(nextRound);
  saveCurrentPlayerIndex(0);
  return rotatedPlayers;
}

export function getSavedUsedQuestionIds(decade: string): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(usedQuestionIdsByDecadeStorageKey);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const ids = parsed[decade];
    if (!Array.isArray(ids)) {
      return [];
    }
    return Array.from(
      new Set(
        ids.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
      )
    );
  } catch {
    return [];
  }
}

export function saveUsedQuestionIds(decade: string, ids: string[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const raw = window.localStorage.getItem(usedQuestionIdsByDecadeStorageKey);
    const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    parsed[decade] = Array.from(
      new Set(ids.filter((id) => typeof id === "string" && id.trim().length > 0))
    );
    window.localStorage.setItem(usedQuestionIdsByDecadeStorageKey, JSON.stringify(parsed));
  } catch {
    const fallback: Record<string, string[]> = {
      [decade]: Array.from(
        new Set(ids.filter((id) => typeof id === "string" && id.trim().length > 0))
      ),
    };
    window.localStorage.setItem(usedQuestionIdsByDecadeStorageKey, JSON.stringify(fallback));
  }
}
