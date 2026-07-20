import { ErrorState } from '@/components/ui/ErrorState';
import { useLastRead } from '@/features/progress/useLastRead';
import { useFavourites } from '@/features/surahs/useFavourites';
import { SurahGrid, SurahGridSkeleton } from '@/features/surahs/SurahGrid';
import { useSurahList } from '@/features/surahs/useSurahList';
import type { SurahMeta } from '@/types/quran';
import { BookOpen } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

type RevelationFilter = 'All' | 'Meccan' | 'Medinan';
type SortKey = 'serial' | 'alpha' | 'ayahs';

const FILTERS: RevelationFilter[] = ['All', 'Meccan', 'Medinan'];
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'serial', label: 'Serial' },
  { key: 'alpha', label: 'Alphabetical' },
  { key: 'ayahs', label: 'Ayah Count' },
];

function sortSurahs(surahs: SurahMeta[], sort: SortKey): SurahMeta[] {
  const copy = [...surahs];
  switch (sort) {
    case 'alpha':
      return copy.sort((a, b) => a.englishName.localeCompare(b.englishName));
    case 'ayahs':
      return copy.sort((a, b) => b.numberOfAyahs - a.numberOfAyahs);
    default:
      return copy.sort((a, b) => a.number - b.number);
  }
}

export function HomePage() {
  const { data: surahs, isLoading, isError, refetch } = useSurahList();
  const { isFavourite, toggleFavourite } = useFavourites();

  const [filter, setFilter] = useState<RevelationFilter>('All');
  const [sort, setSort] = useState<SortKey>('serial');
  const { lastRead } = useLastRead();

  const visible = useMemo(() => {
    if (!surahs) return [];
    const filtered =
      filter === 'All' ? surahs : surahs.filter((s) => s.revelationType === filter);
    return sortSurahs(filtered, sort);
  }, [surahs, filter, sort]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-stone-800 dark:text-slate-100">The Holy Quran</h1>
        <p className="text-sm text-stone-500 dark:text-slate-400">
          Browse all 114 surahs — read, listen, and bookmark.
        </p>
      </div>

      {lastRead && (
        <Link
          to={`/surah/${lastRead.surahNumber}#ayah-${lastRead.ayahNumber}`}
          className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary-soft px-4 py-3 text-primary dark:border-emerald-500/20 dark:bg-slate-800 dark:text-emerald-300"
        >
          <BookOpen className="h-5 w-5" />
          <span className="text-sm font-medium">
            Continue reading {lastRead.surahName} — ayah {lastRead.ayahNumber}
          </span>
        </Link>
      )}

      {/* Filter + sort controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-primary text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-stone-400 dark:text-slate-500">Sort:</span>
          {SORTS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSort(key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                sort === key
                  ? 'bg-primary-soft text-primary dark:bg-slate-700 dark:text-emerald-300'
                  : 'text-stone-500 hover:bg-stone-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <SurahGridSkeleton />}
      {isError && (
        <ErrorState message="Could not load the surah list." onRetry={() => refetch()} />
      )}
      {!isLoading && !isError && (
        <>
          <p className="text-sm text-stone-400 dark:text-slate-500">
            Showing {visible.length} surah{visible.length === 1 ? '' : 's'}
          </p>
          <SurahGrid
            surahs={visible}
            isFavourite={isFavourite}
            onToggleFavourite={toggleFavourite}
          />
        </>
      )}
    </div>
  );
}
