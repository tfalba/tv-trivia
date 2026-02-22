export const appThemes = {
  option1: "Neon Studio",
  option2: "Sunset Arcade",
  option3: "Classic Night",
} as const;

export type AppThemeKey = keyof typeof appThemes;

export const selectedThemeStorageKey = "tv-trivia:selected-theme";

export function getSavedTheme(): AppThemeKey {
  if (typeof window === "undefined") {
    return "option1";
  }

  const saved = window.localStorage.getItem(selectedThemeStorageKey);
  if (saved && saved in appThemes) {
    return saved as AppThemeKey;
  }
  return "option1";
}

export function applyTheme(theme: AppThemeKey): void {
  if (typeof document === "undefined") {
    return;
  }
  document.documentElement.setAttribute("data-theme", theme);
}
