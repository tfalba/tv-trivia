export const decadeShowPresets = {
  "1970s": ["M*A*S*H", "Three's Company", "Happy Days", "The Jeffersons", "Charlie's Angels"],
  "1980s": ["Cheers", "The A-Team", "Knight Rider", "Family Ties", "The Golden Girls"],
  "1990s": ["Friends", "Seinfeld", "The X-Files", "Fresh Prince", "ER"],
  "2000s": ["The Office", "Lost", "House", "Grey's Anatomy", "24"],
  "2010s": ["Breaking Bad", "Game of Thrones", "Stranger Things", "Modern Family", "The Crown"],
} as const;

export type DecadeKey = keyof typeof decadeShowPresets;

export const selectedDecadeStorageKey = "tv-trivia:selected-decade";
export const selectedShowsByDecadeStorageKey = "tv-trivia:selected-shows-by-decade";

export function getSavedDecade(): DecadeKey {
  if (typeof window === "undefined") {
    return "1990s";
  }

  const saved = window.localStorage.getItem(selectedDecadeStorageKey);
  if (saved && saved in decadeShowPresets) {
    return saved as DecadeKey;
  }
  return "1990s";
}

function isDecadeKey(value: string): value is DecadeKey {
  return value in decadeShowPresets;
}

export function getSavedSelectedShowsByDecade(): Partial<Record<DecadeKey, string[]>> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(selectedShowsByDecadeStorageKey);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const result: Partial<Record<DecadeKey, string[]>> = {};

    for (const [decade, shows] of Object.entries(parsed)) {
      if (!isDecadeKey(decade) || !Array.isArray(shows)) {
        continue;
      }
      const cleanedShows = shows
        .filter((show): show is string => typeof show === "string")
        .map((show) => show.trim())
        .filter((show) => show.length > 0);
      result[decade] = Array.from(new Set(cleanedShows)).slice(0, 5);
    }

    return result;
  } catch {
    return {};
  }
}

export function saveSelectedShowsByDecade(
  selections: Partial<Record<DecadeKey, string[]>>
): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(selectedShowsByDecadeStorageKey, JSON.stringify(selections));
}

export function getConfiguredShowsForDecade(decade: DecadeKey): readonly string[] {
  const selected = getSavedSelectedShowsByDecade()[decade] ?? [];
  if (selected.length > 0) {
    return selected;
  }
  return decadeShowPresets[decade];
}
