import { useAuth } from '@/features/auth/useAuth';
import { useBookmarks } from '@/features/bookmarks/useBookmarks';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useCallback } from 'react';

/**
 * Surah-level favourites (the heart on each surah card).
 * - Authenticated: stored as a bookmark with the sentinel ayahNumber 0 (backend).
 * - Guest: persisted to localStorage.
 * Both branches share one { isFavourite, toggleFavourite } interface.
 */
const FAVOURITE_AYAH = 0;

export function useFavourites() {
  const { isAuthenticated } = useAuth();
  const { findBookmark, toggleBookmark } = useBookmarks();
  const [guestFavourites, setGuestFavourites] = useLocalStorage<number[]>('qm:fav-surahs', []);

  const isFavourite = useCallback(
    (surahNumber: number) => {
      if (isAuthenticated) return Boolean(findBookmark(surahNumber, FAVOURITE_AYAH));
      return guestFavourites.includes(surahNumber);
    },
    [isAuthenticated, findBookmark, guestFavourites],
  );

  const toggleFavourite = useCallback(
    (surahNumber: number) => {
      if (isAuthenticated) {
        void toggleBookmark(surahNumber, FAVOURITE_AYAH);
        return;
      }
      setGuestFavourites((prev) =>
        prev.includes(surahNumber)
          ? prev.filter((n) => n !== surahNumber)
          : [...prev, surahNumber],
      );
    },
    [isAuthenticated, toggleBookmark, setGuestFavourites],
  );

  return { isFavourite, toggleFavourite };
}
