import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SearchBar } from '@/features/search/SearchBar';
import { VerseResults, VerseResultsSkeleton } from '@/features/search/VerseResults';
import {
  MAX_RENDERED_MATCHES,
  MIN_QUERY_LENGTH,
  useVerseSearch,
} from '@/features/search/useVerseSearch';
import { useSettings } from '@/features/settings/useSettings';
import { SurahGrid, SurahGridSkeleton } from '@/features/surahs/SurahGrid';
import { useFavourites } from '@/features/surahs/useFavourites';
import { useSurahList } from '@/features/surahs/useSurahList';
import { useDebounce } from '@/hooks/useDebounce';
import type { SurahMeta } from '@/types/quran';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';

/** Match a surah by English name, translation-of-name, Arabic name, or number. */
function matchesSurah(surah: SurahMeta, query: string): boolean {
  const q = query.trim().toLowerCase();
  return (
    surah.englishName.toLowerCase().includes(q) ||
    surah.englishNameTranslation.toLowerCase().includes(q) ||
    surah.name.includes(query.trim()) ||
    String(surah.number) === q ||
    String(surah.number).startsWith(q)
  );
}

const sectionHeading = 'text-sm font-semibold text-stone-700 dark:text-slate-200';

export function SearchPage() {
  const { data: surahs, isLoading, isError, refetch } = useSurahList();
  const { isFavourite, toggleFavourite } = useFavourites();
  const { preferences } = useSettings();
  const [query, setQuery] = useState('');

  const trimmed = query.trim();
  // Surah matching is a local filter and stays instant; only the verse request waits.
  const debouncedQuery = useDebounce(trimmed);

  const surahResults = useMemo(() => {
    if (!surahs || !trimmed) return [];
    return surahs.filter((s) => matchesSurah(s, trimmed));
  }, [surahs, trimmed]);

  const verses = useVerseSearch(debouncedQuery, preferences.translationEdition);
  const isQueryTooShort = trimmed.length > 0 && trimmed.length < MIN_QUERY_LENGTH;
  const rendered = verses.data?.matches.slice(0, MAX_RENDERED_MATCHES) ?? [];
  const isCapped = (verses.data?.count ?? 0) > rendered.length;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <h1 className="text-2xl font-bold text-stone-800 dark:text-slate-100">Search</h1>
      <SearchBar value={query} onChange={setQuery} />

      {!trimmed && (
        <EmptyState
          icon={Search}
          title="Search the Quran"
          message="Find a surah by name, meaning, or number — or search the translation for a phrase."
        />
      )}

      {trimmed && (
        <>
          {/* Surahs — a local filter over the cached list, so it renders immediately. */}
          <section className="flex flex-col gap-3">
            <h2 className={sectionHeading}>Surahs</h2>
            {isLoading && <SurahGridSkeleton />}
            {isError && <ErrorState message="Could not load surahs." onRetry={() => refetch()} />}
            {!isLoading && !isError && surahResults.length === 0 && (
              <p className="text-sm text-stone-400 dark:text-slate-500">
                No surah names matched “{trimmed}”.
              </p>
            )}
            {!isLoading && !isError && surahResults.length > 0 && (
              <SurahGrid
                surahs={surahResults}
                isFavourite={isFavourite}
                onToggleFavourite={toggleFavourite}
              />
            )}
          </section>

          {/* Verses — a network request, so it resolves on its own schedule. */}
          <section className="flex flex-col gap-3">
            <h2 className={sectionHeading}>Verses</h2>

            {isQueryTooShort && (
              <p className="text-sm text-stone-400 dark:text-slate-500">
                Type at least {MIN_QUERY_LENGTH} characters to search verse text.
              </p>
            )}

            {!isQueryTooShort && verses.isPending && <VerseResultsSkeleton />}

            {verses.isError && (
              <ErrorState message="Could not search verses." onRetry={() => verses.refetch()} />
            )}

            {verses.isSuccess && verses.data.count === 0 && (
              <p className="text-sm text-stone-400 dark:text-slate-500">
                No verses matched “{debouncedQuery}”.
              </p>
            )}

            {verses.isSuccess && verses.data.count > 0 && (
              <>
                <p className="text-sm text-stone-400 dark:text-slate-500">
                  {isCapped
                    ? `Showing ${rendered.length} of ${verses.data.count} matches`
                    : `${verses.data.count} match${verses.data.count === 1 ? '' : 'es'}`}
                </p>
                <VerseResults matches={rendered} />
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
