import { api } from '@/api/axios';
import { useAuth } from '@/features/auth/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

const FAVOURITES_KEY = 'qm:fav-surahs';

/**
 * On login, migrate any guest localStorage favourites into the user's account as
 * surah-level bookmarks (ayahNumber 0), then clear the local list. Headless.
 * Runs once per login; duplicate POSTs are harmless (backend returns 409, which
 * allSettled swallows).
 */
export function FavouritesMigration() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const doneRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      doneRef.current = false; // allow re-running for the next login
      return;
    }
    if (doneRef.current) return;
    doneRef.current = true;

    let surahs: number[] = [];
    try {
      const raw = window.localStorage.getItem(FAVOURITES_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) surahs = parsed.filter((n) => typeof n === 'number');
    } catch {
      surahs = [];
    }
    if (surahs.length === 0) return;

    void (async () => {
      await Promise.allSettled(
        surahs.map((surahNumber) => api.post('/bookmarks', { surahNumber, ayahNumber: 0 })),
      );
      window.localStorage.removeItem(FAVOURITES_KEY);
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    })();
  }, [isAuthenticated, queryClient]);

  return null;
}
