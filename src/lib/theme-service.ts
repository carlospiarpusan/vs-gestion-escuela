export type ThemePreference = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";
export const THEME_CHANGE_EVENT = "dashboard:theme-change";

export function normalizeThemePreference(value: string | null | undefined): ThemePreference {
  return value === "dark" ? "dark" : "light";
}

export function getStoredThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "light";
  return normalizeThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY));
}

export function applyThemePreference(theme: ThemePreference) {
  if (typeof window === "undefined") return;

  document.documentElement.classList.toggle("dark", theme === "dark");
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  window.dispatchEvent(new CustomEvent<ThemePreference>(THEME_CHANGE_EVENT, { detail: theme }));
}

export function toggleThemePreference(currentTheme: ThemePreference): ThemePreference {
  const nextTheme = currentTheme === "dark" ? "light" : "dark";
  applyThemePreference(nextTheme);
  return nextTheme;
}
