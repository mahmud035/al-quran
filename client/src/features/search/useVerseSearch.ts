import type { TranslationEdition } from '@/types/api';
import { ALQURAN_BASE } from '@/utils/constants';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface AlQuranEnvelope<T> {
  code: number;
  status: string;
  data: T;
}

interface SearchMatch {
  number: number;
  text: string;
  numberInSurah: number;
  surah: {
    number: number;
    englishName: string;
  };
}

/** One verse hit, flattened for rendering. */
export interface VerseMatch {
  surahNumber: number;
  surahEnglishName: string;
  numberInSurah: number;
  text: string;
}

export interface VerseSearchResult {
  /** Total matches reported by the API — may exceed the number rendered. */
  count: number;
  matches: VerseMatch[];
}

/** Below this length no request is issued — single letters match thousands of verses. */
export const MIN_QUERY_LENGTH = 3;

/** The endpoint has no pagination parameter, so the cap is applied at the render layer. */
export const MAX_RENDERED_MATCHES = 50;

/**
 * Full-text search across one translation edition. The edition is part of the query
 * key: the same phrase against a different translation is a different result set.
 *
 * Disabled until the trimmed query reaches MIN_QUERY_LENGTH.
 */
export function useVerseSearch(query: string, translationEdition: TranslationEdition) {
  const trimmed = query.trim();

  return useQuery<VerseSearchResult>({
    queryKey: ['verse-search', trimmed, translationEdition],
    enabled: trimmed.length >= MIN_QUERY_LENGTH,
    queryFn: async () => {
      try {
        const res = await axios.get<AlQuranEnvelope<{ count: number; matches: SearchMatch[] }>>(
          `${ALQURAN_BASE}/search/${encodeURIComponent(trimmed)}/all/${translationEdition}`,
        );
        const { count, matches } = res.data.data;
        return {
          count,
          matches: matches.map((m) => ({
            surahNumber: m.surah.number,
            surahEnglishName: m.surah.englishName,
            numberInSurah: m.numberInSurah,
            text: m.text,
          })),
        };
      } catch (error) {
        // The API answers "no matches" with a 404, which axios throws. That is an
        // empty result, not a failure; every other status stays an error.
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          return { count: 0, matches: [] };
        }
        throw error;
      }
    },
  });
}
