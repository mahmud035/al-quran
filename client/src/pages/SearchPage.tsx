import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SearchBar } from '@/features/search/SearchBar';
import { SurahGrid, SurahGridSkeleton } from '@/features/surahs/SurahGrid';
import { useFavourites } from '@/features/surahs/useFavourites';
import { useSurahList } from '@/features/surahs/useSurahList';
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

export function SearchPage() {
  const { data: surahs, isLoading, isError, refetch } = useSurahList();
  const { isFavourite, toggleFavourite } = useFavourites();
  const [query, setQuery] = useState('');

  const trimmed = query.trim();
  const results = useMemo(() => {
    if (!surahs || !trimmed) return [];
    return surahs.filter((s) => matchesSurah(s, trimmed));
  }, [surahs, trimmed]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <h1 className="text-2xl font-bold text-stone-800 dark:text-slate-100">Search surahs</h1>
      <SearchBar value={query} onChange={setQuery} />

      {isLoading && <SurahGridSkeleton />}
      {isError && <ErrorState message="Could not load surahs." onRetry={() => refetch()} />}

      {!isLoading && !isError && !trimmed && (
        <EmptyState
          icon={Search}
          title="Find a surah"
          message="Search by name (e.g. “Baqara”), meaning (e.g. “The Cow”), or number."
        />
      )}

      {!isLoading && !isError && trimmed && (
        <>
          {results.length === 0 ? (
            <EmptyState icon={Search} title="No surahs found" message={`Nothing matched “${trimmed}”.`} />
          ) : (
            <>
              <p className="text-sm text-stone-400 dark:text-slate-500">
                {results.length} surah{results.length === 1 ? '' : 's'}
              </p>
              <SurahGrid surahs={results} isFavourite={isFavourite} onToggleFavourite={toggleFavourite} />
            </>
          )}
        </>
      )}
    </div>
  );
}
