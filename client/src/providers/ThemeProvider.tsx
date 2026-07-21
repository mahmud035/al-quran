import type { Theme } from '@/types/api';
import {
  applyTheme,
  getStoredTheme,
  resolveSystemTheme,
  resolveThemePreference,
  setStoredTheme,
  subscribeToSystemTheme,
  type ResolvedTheme,
} from '@/utils/theme';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

interface ThemeContextValue {
  /** What the user chose. This is the value that gets persisted. */
  preference: Theme;
  /** What that renders as right now. Never persisted — see utils/theme.ts. */
  resolvedTheme: ResolvedTheme;
  /** Apply a deliberate choice. Marks the session so a later sync cannot undo it. */
  setPreference: (preference: Theme) => void;
  /** Apply a theme fetched at login, unless the user already chose in this session. */
  adoptServerTheme: (theme: Theme) => void;
  /** Forget any choice made so far, so the next login may apply its own theme. */
  resetSessionChoice: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/** Stable no-op subscription, used when the OS scheme is irrelevant to the preference. */
const IGNORE_SYSTEM_THEME = () => () => {};

/**
 * Owns the theme as presentation state: the preference, the device cache, and the
 * class on <html>. Deliberately free of auth and query dependencies — it has to work
 * before any data loads. Persisting to the server is layered on top by
 * features/settings/useThemeSetting.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<Theme>(() =>
    resolveThemePreference({ status: 'unfetched' }, getStoredTheme(), false),
  );

  // Whether the user has chosen a theme since the last login boundary. A ref, not
  // state: it never affects rendering, only whether a server value is allowed to win.
  // Scoped to the login window rather than the page (design D4) — left set for the
  // life of the page it would suppress the next account's theme entirely.
  const chosenThisSession = useRef(false);

  // The OS colour scheme, read straight from the platform rather than mirrored into
  // state — so it can never go stale, including across a spell of not listening.
  // Subscribed only while the preference is `system`; under an explicit choice the
  // store is inert and nothing reads its value.
  const systemTheme = useSyncExternalStore(
    preference === 'system' ? subscribeToSystemTheme : IGNORE_SYSTEM_THEME,
    resolveSystemTheme,
    () => 'light' as ResolvedTheme,
  );

  const resolvedTheme = preference === 'system' ? systemTheme : preference;

  // The pre-paint script in index.html has already applied this on first load, so the
  // mount pass is a no-op and nothing flashes on hydration.
  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  // Cache whatever the preference settles on, from either setter, so the next load
  // paints it before the settings request returns.
  useEffect(() => {
    setStoredTheme(preference);
  }, [preference]);

  const setPreference = useCallback((next: Theme) => {
    chosenThisSession.current = true;
    setPreferenceState(next);
  }, []);

  const adoptServerTheme = useCallback((theme: Theme) => {
    // Read the ref here, in the callback, so the state updater stays pure — React may
    // call an updater more than once.
    const chosen = chosenThisSession.current;
    setPreferenceState((current) =>
      resolveThemePreference({ status: 'fetched', theme }, current, chosen),
    );
  }, []);

  const resetSessionChoice = useCallback(() => {
    chosenThisSession.current = false;
  }, []);

  const value = useMemo(
    () => ({ preference, resolvedTheme, setPreference, adoptServerTheme, resetSessionChoice }),
    [preference, resolvedTheme, setPreference, adoptServerTheme, resetSessionChoice],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
