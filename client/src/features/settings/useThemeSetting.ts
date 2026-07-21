import { useSettings } from '@/features/settings/useSettings';
import { useTheme } from '@/providers/ThemeProvider';
import type { Theme } from '@/types/api';
import { useCallback } from 'react';

/**
 * The one way to change the theme. Every control routes through this so a choice can
 * never be applied without being persisted — the navbar toggle used to change the
 * theme and nothing else, which is why a logged-in user's dark mode did not survive
 * a reload.
 *
 * Fans a choice out to three places: React state and the device cache (via
 * ThemeProvider), and the settings store — the server for an authenticated user, and
 * local storage for a guest, which `updatePreferences` already selects between.
 */
export function useThemeSetting() {
  const { preference, resolvedTheme, setPreference } = useTheme();
  const { updatePreferences } = useSettings();

  const setTheme = useCallback(
    (next: Theme) => {
      setPreference(next);
      updatePreferences({ theme: next }).catch(() => {
        // The choice is already applied and cached, so the user sees what they picked.
        // A failed write is retried implicitly the next time they change the setting.
      });
    },
    [setPreference, updatePreferences],
  );

  return { preference, resolvedTheme, setTheme };
}
