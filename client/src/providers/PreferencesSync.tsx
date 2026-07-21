import { useAuth } from '@/features/auth/useAuth';
import { usePlayer } from '@/features/player/usePlayer';
import { useSettings } from '@/features/settings/useSettings';
import { useTheme } from '@/providers/ThemeProvider';
import { useEffect, useRef } from 'react';

/**
 * On login, apply the user's server-saved theme + reciter once (cross-device sync).
 * Guests are untouched: their theme is device-local (ThemeProvider/localStorage) and
 * their reciter is whatever they pick in the player. Headless — renders nothing.
 *
 * Gated on the settings request having actually succeeded. The previous `!isLoading`
 * guard also passed while the query was enabled but not yet fetching, and applied the
 * placeholder theme from that window over the user's real one.
 */
export function PreferencesSync() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { preferences, isSuccess } = useSettings();
  const { adoptServerTheme, resetSessionChoice } = useTheme();
  const { setReciter, state } = usePlayer();
  const syncedRef = useRef(false);
  // Whether we have been through a *settled* logged-out state — the session probe
  // resolved and there was no user. Distinct from the boot window, where auth is
  // simply not known yet and nothing has been signed out of.
  const wasLoggedOutRef = useRef(false);

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      syncedRef.current = false; // reset so the next login re-syncs
      wasLoggedOutRef.current = true;
      return;
    }
    if (!isAuthenticated) return; // session probe still in flight

    if (wasLoggedOutRef.current) {
      wasLoggedOutRef.current = false;
      // A theme picked while logged out belongs to that browsing session, not to
      // whoever signs in now — otherwise their saved theme is silently discarded and
      // reappears on the next reload. Cleared here rather than at logout because the
      // choice is usually made in between the two.
      resetSessionChoice();
    }

    if (!isSuccess || syncedRef.current) return;

    // adoptServerTheme yields to a theme the user picked while this request was in
    // flight, so a deliberate choice is never clobbered by its own login sync.
    if (preferences.theme) adoptServerTheme(preferences.theme);
    if (state.currentSurah === null) {
      setReciter(preferences.reciter);
    }
    syncedRef.current = true;
  }, [
    isAuthenticated,
    isAuthLoading,
    isSuccess,
    preferences,
    adoptServerTheme,
    resetSessionChoice,
    setReciter,
    state.currentSurah,
  ]);

  return null;
}
