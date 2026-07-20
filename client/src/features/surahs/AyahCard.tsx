import { BookmarkButton } from '@/features/bookmarks/BookmarkButton';
import { formatAyahShareText } from '@/features/surahs/formatAyahShareText';
import type { ReaderAyah } from '@/features/surahs/useSurah';
import type { FontSize } from '@/types/api';
import { ARABIC_TEXT_SIZE } from '@/utils/constants';
import { Check, Copy, Play, Share2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface AyahCardProps {
  ayah: ReaderAyah;
  surahNumber: number;
  surahEnglishName: string;
  fontSize: FontSize;
  isActive?: boolean; // driven by the audio player (Batch 4)
  onPlay?: () => void; // jump playback to this ayah (Batch 4)
}

/** Web Share is absent on most desktop browsers; detect it rather than sniffing the UA. */
const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

export function AyahCard({
  ayah,
  surahNumber,
  surahEnglishName,
  fontSize,
  isActive = false,
  onPlay,
}: AyahCardProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const revertTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(revertTimer.current), []);

  function flash(next: 'copied' | 'failed') {
    setCopyState(next);
    clearTimeout(revertTimer.current);
    revertTimer.current = setTimeout(() => setCopyState('idle'), 2000);
  }

  const shareText = () => formatAyahShareText(ayah, surahNumber, surahEnglishName);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareText());
      flash('copied');
    } catch {
      flash('failed');
    }
  }

  async function handleShare() {
    try {
      await navigator.share({ text: shareText() });
    } catch (error) {
      // Dismissing the share sheet rejects with AbortError — that is not a failure.
      if (!(error instanceof DOMException && error.name === 'AbortError')) flash('failed');
    }
  }

  return (
    <article
      id={`ayah-${ayah.numberInSurah}`}
      className={`scroll-mt-24 rounded-xl border p-5 transition-colors ${
        isActive
          ? 'border-l-4 border-l-accent border-stone-200 bg-accent/5 dark:border-slate-700 dark:bg-accent/10'
          : 'border-stone-200 bg-white dark:border-slate-700 dark:bg-slate-800'
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary dark:bg-slate-700 dark:text-emerald-300">
          {surahNumber}:{ayah.numberInSurah}
        </span>
        <div className="flex items-center gap-1">
          {/* Announced on both paths; the icon alone would leave a failure silent. */}
          <span role="status" className="mr-1 text-xs text-stone-500 dark:text-slate-400">
            {copyState === 'copied' && 'Copied'}
            {copyState === 'failed' && 'Could not copy'}
          </span>
          <button
            onClick={onPlay}
            aria-label="Play this ayah"
            className="rounded-md p-1.5 text-stone-400 transition-colors hover:text-primary dark:text-slate-500 dark:hover:text-emerald-300"
          >
            <Play className="h-5 w-5" />
          </button>

          <button
            onClick={handleCopy}
            aria-label={copyState === 'copied' ? 'Ayah copied' : 'Copy ayah'}
            className={`rounded-md p-1.5 transition-colors ${
              copyState === 'copied'
                ? 'text-primary dark:text-emerald-300'
                : 'text-stone-400 hover:text-primary dark:text-slate-500 dark:hover:text-emerald-300'
            }`}
          >
            {copyState === 'copied' ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
          </button>

          {canShare && (
            <button
              onClick={handleShare}
              aria-label="Share ayah"
              className="rounded-md p-1.5 text-stone-400 transition-colors hover:text-primary dark:text-slate-500 dark:hover:text-emerald-300"
            >
              <Share2 className="h-5 w-5" />
            </button>
          )}

          <BookmarkButton surahNumber={surahNumber} ayahNumber={ayah.numberInSurah} />
        </div>
      </div>

      <p
        className={`font-arabic mb-4 text-right text-stone-800 dark:text-slate-100 ${ARABIC_TEXT_SIZE[fontSize]}`}
      >
        {ayah.arabic}
      </p>

      {ayah.transliteration && (
        <p className="mb-2 text-sm italic text-stone-500 dark:text-slate-400">
          {ayah.transliteration}
        </p>
      )}

      <p className="text-stone-600 dark:text-slate-300">{ayah.translation}</p>
    </article>
  );
}
