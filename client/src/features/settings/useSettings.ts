import { api } from '@/api/axios';
import { useAuth } from '@/features/auth/useAuth';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useToast } from '@/providers/ToastProvider';
import type { ApiEnvelope, FontSize, Reciter, Theme, TranslationEdition, UserSettings } from '@/types/api';
import { DEFAULT_FONT_SIZE, DEFAULT_RECITER, DEFAULT_TRANSLATION } from '@/utils/constants';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

export interface Preferences {
  reciter: Reciter;
  translationEdition: TranslationEdition;
  fontSize: FontSize;
  /**
   * Absent until a real value exists — a fetched server value, or a guest's own
   * choice. There is deliberately no default: a placeholder theme here is
   * indistinguishable from a fetched one, and applying it is what used to reset a
   * logged-in user's theme on reload. The device cache owns the fallback instead
   * (see utils/theme.ts).
   */
  theme?: Theme;
}

const DEFAULTS: Preferences = {
  reciter: DEFAULT_RECITER,
  translationEdition: DEFAULT_TRANSLATION,
  fontSize: DEFAULT_FONT_SIZE,
};

/**
 * Single wording for a failed write, so repeated failures coalesce into one message
 * rather than stacking.
 */
const SETTINGS_SYNC_FAILED_MESSAGE =
  'Couldn’t sync your settings — they’ll apply on this device only.';

const pick = (s: UserSettings): Preferences => ({
  reciter: s.reciter,
  translationEdition: s.translationEdition,
  fontSize: s.fontSize,
  theme: s.theme,
});

/**
 * Reading preferences with a guest/auth split:
 * - guest: persisted to localStorage
 * - authenticated: synced to GET/PUT /api/settings (TanStack Query)
 * Both expose the same { preferences, updatePreferences } interface.
 */
export function useSettings() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [guestPrefs, setGuestPrefs] = useLocalStorage<Preferences>('qm:settings', DEFAULTS);

  const settingsQuery = useQuery<Preferences>({
    queryKey: ['settings'],
    enabled: isAuthenticated,
    staleTime: 60_000,
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<UserSettings>>('/settings');
      return pick(res.data.data);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (patch: Partial<Preferences>) => {
      const res = await api.put<ApiEnvelope<UserSettings>>('/settings', patch);
      return pick(res.data.data);
    },
    onSuccess: (prefs) => queryClient.setQueryData(['settings'], prefs),
  });

  const preferences: Preferences = isAuthenticated
    ? (settingsQuery.data ?? DEFAULTS)
    : guestPrefs;

  /**
   * Apply a preference change. Never rejects: a failed server write is reported to the
   * user here and the call resolves. Correctness used to depend on each call site
   * remembering to catch, and three of the four did not — so the handling lives at the
   * one point the failure occurs rather than at every call site added in future
   * (design D1). The chosen value stays applied locally either way.
   */
  const updatePreferences = useCallback(
    async (patch: Partial<Preferences>) => {
      if (!isAuthenticated) {
        setGuestPrefs((prev) => ({ ...prev, ...patch }));
        return;
      }
      try {
        await updateMutation.mutateAsync(patch);
      } catch {
        // The consequence, not the mechanism (design D6) — true whether the cause was
        // offline, a 500, or a timeout.
        notify(SETTINGS_SYNC_FAILED_MESSAGE);
      }
    },
    [isAuthenticated, updateMutation, setGuestPrefs, notify],
  );

  return {
    preferences,
    updatePreferences,
    /**
     * The settings actually came back from the server. Deliberately not `!isLoading`,
     * which is also false for a query that is enabled but has not begun fetching —
     * the window in which the old sync applied a placeholder theme.
     */
    isSuccess: isAuthenticated && settingsQuery.isSuccess,
  };
}
