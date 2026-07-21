// Theme preference: the device cache, the precedence rule, and the DOM application.
// The cache is a raw string, not JSON, because the pre-paint script in index.html
// reads this same key before any module loads and must not risk a JSON.parse throw.
// Keep that script and resolveSystemTheme() below in step — they are one rule.

import type { Theme } from '@/types/api';

export const THEME_STORAGE_KEY = 'qm:theme';

/** The theme actually applied to the document. `system` resolves into one of these. */
export type ResolvedTheme = 'light' | 'dark';

const VALID_THEMES: readonly string[] = ['system', 'light', 'dark'];

function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && VALID_THEMES.includes(value);
}

/** The cached preference, or null when absent, corrupt, or unreadable. */
export function getStoredTheme(): Theme | null {
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(raw) ? raw : null;
  } catch {
    // Storage disabled or blocked — the caller falls back to the system scheme.
    return null;
  }
}

export function setStoredTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Quota exceeded or storage disabled — the theme still applies for this session.
  }
}

/**
 * The server's theme, when there is one. `unfetched` covers every state that is not a
 * successful response — guest, pending, disabled, and failed alike — so a caller
 * cannot mistake "nothing loaded yet" for "the server says light". That conflation is
 * the bug this change exists to fix.
 */
export type ServerTheme = { status: 'unfetched' } | { status: 'fetched'; theme: Theme };

/**
 * Which preference wins (design D2). Pure, so every row is directly testable:
 *
 *   chosen this session     →  the cached choice, whatever the server says
 *   server fetched          →  the server value
 *   cache only              →  the cached value
 *   nothing                 →  system
 *
 * A choice made in this session outranks a server value that arrives afterwards: the
 * response was already in flight when the user clicked, and clobbering a deliberate
 * choice with it is indistinguishable from the setting resetting itself.
 */
export function resolveThemePreference(
  server: ServerTheme,
  cached: Theme | null,
  chosenThisSession: boolean,
): Theme {
  if (chosenThisSession) return cached ?? 'system';
  if (server.status === 'fetched') return server.theme;
  return cached ?? 'system';
}

/** The OS colour scheme. Falls back to light where matchMedia is unavailable. */
export function resolveSystemTheme(): ResolvedTheme {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

/**
 * Watch the OS colour scheme. Returns an unsubscribe function, and a no-op one where
 * matchMedia is unavailable, so callers need no capability check of their own.
 * Only worth subscribing while the preference is `system` — under an explicit choice
 * there is nothing to react to.
 */
export function subscribeToSystemTheme(listener: (theme: ResolvedTheme) => void): () => void {
  try {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (event: MediaQueryListEvent) => listener(event.matches ? 'dark' : 'light');
    query.addEventListener('change', handler);
    return () => query.removeEventListener('change', handler);
  } catch {
    return () => {};
  }
}

/** Reflect the resolved theme on <html> (class strategy for Tailwind `dark:`). */
export function applyTheme(resolved: ResolvedTheme): void {
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}
