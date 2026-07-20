import type { VerseMatch } from '@/features/search/useVerseSearch';
import { Link } from 'react-router-dom';

interface VerseResultsProps {
  matches: VerseMatch[];
}

/** Verse hits, each deep-linking to its ayah anchor in the reader. */
export function VerseResults({ matches }: VerseResultsProps) {
  return (
    <ul className="flex flex-col gap-2">
      {matches.map((m) => (
        <li key={`${m.surahNumber}:${m.numberInSurah}`}>
          <Link
            to={`/surah/${m.surahNumber}#ayah-${m.numberInSurah}`}
            className="block rounded-xl border border-stone-200 bg-white p-3 hover:border-primary dark:border-slate-700 dark:bg-slate-800"
          >
            <span className="text-xs text-stone-400 dark:text-slate-500">
              {m.surahEnglishName} {m.surahNumber}:{m.numberInSurah}
            </span>
            <p className="mt-1 text-sm text-stone-700 dark:text-slate-200">{m.text}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function VerseResultsSkeleton() {
  return (
    <ul className="flex flex-col gap-2">
      {Array.from({ length: 4 }, (_, i) => (
        <li
          key={i}
          className="h-20 animate-pulse rounded-xl border border-stone-200 bg-stone-100 dark:border-slate-700 dark:bg-slate-800"
        />
      ))}
    </ul>
  );
}
