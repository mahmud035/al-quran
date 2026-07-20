import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { FontSizeControl } from '@/components/ui/FontSizeControl';
import { Skeleton } from '@/components/ui/Skeleton';
import { PlayerBar } from '@/features/player/PlayerBar';
import { usePlayer } from '@/features/player/usePlayer';
import { AyahCard } from '@/features/surahs/AyahCard';
import { useSurah } from '@/features/surahs/useSurah';
import { useSettings } from '@/features/settings/useSettings';
import { DWELL_MS } from '@/utils/constants';
import { setLastRead } from '@/utils/lastRead';
import { Play } from 'lucide-react';
import { useEffect, useRef } from 'react';

const BISMILLAH = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';

/** Bismillah is a header for every surah except Al-Fatiha (1, where it is ayah 1) and At-Tawba (9, none). */
function showBismillah(surahNumber: number): boolean {
  return surahNumber !== 1 && surahNumber !== 9;
}

interface SurahReaderProps {
  surahNumber: number;
  /**
   * Called with a global ayah number once that ayah has held the reading zone long
   * enough to count as read. Optional so the reader works standalone; the page wires
   * it to progress recording.
   */
  onAyahRead?: (globalAyahNumber: number) => void;
}

export function SurahReader({ surahNumber, onAyahRead }: SurahReaderProps) {
  const { preferences, updatePreferences } = useSettings();
  const player = usePlayer();
  const { data: surah, isLoading, isError, refetch } = useSurah(
    surahNumber,
    preferences.translationEdition,
  );

  const isPlayingThisSurah = player.state.currentSurah === surahNumber;

  // Track the ayah currently near the top of the viewport for the last-read write.
  const currentAyahRef = useRef(1);
  const surahNameRef = useRef('');

  // Mirror the surah name into a ref (updated in an effect, never during render).
  useEffect(() => {
    surahNameRef.current = surah?.englishName ?? '';
  }, [surah]);

  // Persist last-read position on unmount (localStorage only — no DB write on scroll).
  useEffect(() => {
    return () => {
      setLastRead({
        surahNumber,
        surahName: surahNameRef.current || `Surah ${surahNumber}`,
        ayahNumber: currentAyahRef.current,
      });
    };
  }, [surahNumber]);

  // Keep the callback in a ref so the observer effect does not re-run (and re-observe
  // every node) when the parent hands down a new function identity.
  const onAyahReadRef = useRef(onAyahRead);
  useEffect(() => {
    onAyahReadRef.current = onAyahRead;
  }, [onAyahRead]);

  // Observe ayah cards to know which one is being read.
  //
  // The same observer drives two things: the last-read position (immediately) and
  // progress recording (after a dwell). An ayah only counts as read once it has held
  // the zone continuously for DWELL_MS, so scrolling past does not credit it. Audio
  // autoscroll moves ayahs into this same zone, so listening qualifies on this path
  // too, which is intended.
  useEffect(() => {
    if (!surah) return;

    const dwellTimers = new Map<number, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          const globalNumber = Number(el.dataset.globalAyah);

          if (entry.isIntersecting) {
            const n = Number(el.dataset.ayah);
            if (n) currentAyahRef.current = n;

            // Already counting down for this ayah — leave the existing timer alone.
            if (globalNumber && !dwellTimers.has(globalNumber)) {
              const timer = window.setTimeout(() => {
                dwellTimers.delete(globalNumber);
                onAyahReadRef.current?.(globalNumber);
              }, DWELL_MS);
              dwellTimers.set(globalNumber, timer);
            }
          } else if (globalNumber) {
            // Left the zone before qualifying: discard the partial dwell so a later
            // visit has to earn the full duration again.
            const timer = dwellTimers.get(globalNumber);
            if (timer !== undefined) {
              window.clearTimeout(timer);
              dwellTimers.delete(globalNumber);
            }
          }
        }
      },
      { rootMargin: '-20% 0px -70% 0px' },
    );

    const nodes = document.querySelectorAll<HTMLElement>('[data-ayah]');
    nodes.forEach((node) => observer.observe(node));

    return () => {
      observer.disconnect();
      dwellTimers.forEach((timer) => window.clearTimeout(timer));
      dwellTimers.clear();
    };
  }, [surah]);

  // Scroll to a deep-linked ayah (#ayah-N) once data has rendered.
  useEffect(() => {
    if (!surah) return;
    if (window.location.hash) {
      const el = document.querySelector(window.location.hash);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [surah]);

  // Keep the currently-playing ayah in view.
  useEffect(() => {
    if (!surah || !isPlayingThisSurah) return;
    const ayah = surah.ayahs[player.state.currentAyahIndex];
    if (!ayah) return;
    document
      .getElementById(`ayah-${ayah.numberInSurah}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [surah, isPlayingThisSurah, player.state.currentAyahIndex]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-44 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError || !surah) {
    return <ErrorState message="Could not load this surah." onRetry={() => refetch()} />;
  }

  return (
    <div className="flex flex-col gap-5 pb-28">
      {/* Surah header */}
      <header className="flex flex-col items-center gap-2 rounded-2xl bg-primary px-6 py-6 text-center text-white">
        <span className="font-arabic text-3xl">{surah.name}</span>
        <h1 className="text-xl font-bold">{surah.englishName}</h1>
        <p className="text-sm text-emerald-100">{surah.englishNameTranslation}</p>
        <div className="mt-1 flex items-center gap-2 text-emerald-100">
          <Badge tone="primary">{surah.revelationType}</Badge>
          <span className="text-xs">{surah.numberOfAyahs} ayahs</span>
        </div>
      </header>

      {/* Reading controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button onClick={() => player.playSurah(surahNumber, surah.globalAyahNumbers)}>
          <Play className="h-4 w-4" />
          Play Surah
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-sm text-stone-500 dark:text-slate-400">Font size</span>
          <FontSizeControl
            value={preferences.fontSize}
            onChange={(fontSize) => void updatePreferences({ fontSize })}
          />
        </div>
      </div>

      {showBismillah(surahNumber) && (
        <p className="font-arabic py-2 text-center text-3xl text-primary dark:text-emerald-300">
          {BISMILLAH}
        </p>
      )}

      <div className="flex flex-col gap-4">
        {surah.ayahs.map((ayah, index) => (
          <div
            key={ayah.numberInSurah}
            data-ayah={ayah.numberInSurah}
            data-global-ayah={ayah.globalNumber}
          >
            <AyahCard
              ayah={ayah}
              surahNumber={surahNumber}
              surahEnglishName={surah.englishName}
              fontSize={preferences.fontSize}
              isActive={isPlayingThisSurah && player.state.currentAyahIndex === index}
              onPlay={() => player.playAyah(surahNumber, surah.globalAyahNumbers, index)}
            />
          </div>
        ))}
      </div>

      <PlayerBar />
    </div>
  );
}
