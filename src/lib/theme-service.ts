export type ThemePreference = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";
export const THEME_CHANGE_EVENT = "dashboard:theme-change";

export function normalizeThemePreference(value: string | null | undefined): ThemePreference {
  return value === "dark" ? "dark" : "light";
}

export function getStoredThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "light";
  try {
    return normalizeThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  }
}

export function applyThemePreference(theme: ThemePreference) {
  if (typeof window === "undefined") return;

  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Applying the theme must work even when the preference cannot be persisted.
  }
  window.dispatchEvent(new CustomEvent<ThemePreference>(THEME_CHANGE_EVENT, { detail: theme }));
}

export function toggleThemePreference(currentTheme: ThemePreference): ThemePreference {
  const nextTheme = currentTheme === "dark" ? "light" : "dark";
  applyThemePreference(nextTheme);
  return nextTheme;
}
