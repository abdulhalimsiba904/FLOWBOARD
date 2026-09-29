import type { ThemePreference } from '../types/theme'

const KEY = 'flowboard-theme'
const choices: ThemePreference[] = ['light', 'dark', 'system']

export function readThemePreference(): ThemePreference {
  try {
    const value = window.localStorage.getItem(KEY)
    return choices.includes(value as ThemePreference) ? (value as ThemePreference) : 'system'
  } catch {
    return 'system'
  }
}

export function saveThemePreference(value: ThemePreference): void {
  try {
    window.localStorage.setItem(KEY, value)
  } catch {
    // The app still works with the in-memory preference when storage is unavailable.
  }
}
