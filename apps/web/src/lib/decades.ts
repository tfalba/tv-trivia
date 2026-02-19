export const decadeShowPresets = {
  "1970s": ["M*A*S*H", "Three's Company", "Happy Days", "The Jeffersons", "Charlie's Angels"],
  "1980s": ["Cheers", "The A-Team", "Knight Rider", "Family Ties", "The Golden Girls"],
  "1990s": ["Friends", "Seinfeld", "The X-Files", "Fresh Prince", "ER"],
  "2000s": ["The Office", "Lost", "House", "Grey's Anatomy", "24"],
  "2010s": ["Breaking Bad", "Game of Thrones", "Stranger Things", "Modern Family", "The Crown"],
} as const;

export type DecadeKey = keyof typeof decadeShowPresets;

export const selectedDecadeStorageKey = "tv-trivia:selected-decade";

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
