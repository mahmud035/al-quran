import type { RepeatMode } from '@/context/playerReducer';
import { playerSelectClass } from '@/features/player/controlStyles';
import { DEFAULT_REPEAT_COUNT, REPEAT_COUNTS } from '@/utils/constants';

interface RepeatControlProps {
  repeat: RepeatMode;
  /** Plays completed at the current position, or passes completed over the range. */
  repeatsDone: number;
  currentAyahIndex: number;
  /** Number of ayahs in the loaded playlist. */
  total: number;
  onChange: (repeat: RepeatMode) => void;
}

/** Ayah numbers are 1-based in the UI; the reducer stores 0-based playlist indices. */
const toAyahNumber = (index: number) => index + 1;
const toIndex = (ayahNumber: number) => ayahNumber - 1;

function countLabel(count: number) {
  return count === Infinity ? '∞' : `${count}×`;
}

/**
 * Repeat mode picker, plus the count and range bounds the active mode needs.
 * Renders ayah numbers throughout; conversion to playlist indices happens here.
 */
export function RepeatControl({
  repeat,
  repeatsDone,
  currentAyahIndex,
  total,
  onChange,
}: RepeatControlProps) {
  const isActive = repeat.kind !== 'off';
  const count = repeat.kind === 'ayah' || repeat.kind === 'range' ? repeat.count : null;
  const ayahNumbers = Array.from({ length: total }, (_, i) => i + 1);

  function selectMode(kind: RepeatMode['kind']) {
    if (kind === 'off') return onChange({ kind: 'off' });
    if (kind === 'surah') return onChange({ kind: 'surah' });
    if (kind === 'ayah') return onChange({ kind: 'ayah', count: DEFAULT_REPEAT_COUNT });
    // A fresh range starts at the current ayah and runs five ayahs, clamped to the
    // end of the surah — a drill-sized span the user can then widen or narrow.
    onChange({
      kind: 'range',
      start: currentAyahIndex,
      end: Math.min(currentAyahIndex + 4, total - 1),
      count: DEFAULT_REPEAT_COUNT,
    });
  }

  function setCount(next: number) {
    if (repeat.kind === 'ayah') onChange({ ...repeat, count: next });
    else if (repeat.kind === 'range') onChange({ ...repeat, count: next });
  }

  // Moving one bound past the other drags the other with it, so start <= end holds.
  function setStart(index: number) {
    if (repeat.kind !== 'range') return;
    onChange({ ...repeat, start: index, end: Math.max(index, repeat.end) });
  }

  function setEnd(index: number) {
    if (repeat.kind !== 'range') return;
    onChange({ ...repeat, start: Math.min(index, repeat.start), end: index });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <select
        value={repeat.kind}
        onChange={(e) => selectMode(e.target.value as RepeatMode['kind'])}
        aria-label="Repeat mode"
        className={playerSelectClass(isActive, 'strong')}
      >
        <option value="off">Repeat off</option>
        <option value="ayah">Repeat ayah</option>
        <option value="range">Repeat range</option>
        <option value="surah">Loop surah</option>
      </select>

      {count !== null && (
        <>
          <select
            value={String(count)}
            onChange={(e) => setCount(Number(e.target.value))}
            aria-label="Repeat count"
            className={playerSelectClass()}
          >
            {REPEAT_COUNTS.map((c) => (
              <option key={String(c)} value={String(c)}>
                {countLabel(c)}
              </option>
            ))}
          </select>

          <span
            className="whitespace-nowrap text-xs tabular-nums text-stone-500 dark:text-slate-400"
            aria-label={
              count === Infinity
                ? 'Repeating without limit'
                : `Play ${Math.min(repeatsDone + 1, count)} of ${count}`
            }
          >
            {count === Infinity ? '∞' : `${Math.min(repeatsDone + 1, count)}/${count}`}
          </span>
        </>
      )}

      {repeat.kind === 'range' && (
        <span className="flex items-center gap-1.5">
          <select
            value={toAyahNumber(repeat.start)}
            onChange={(e) => setStart(toIndex(Number(e.target.value)))}
            aria-label="Range start ayah"
            className={playerSelectClass()}
          >
            {ayahNumbers.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span className="text-xs text-stone-400 dark:text-slate-500">–</span>
          <select
            value={toAyahNumber(repeat.end)}
            onChange={(e) => setEnd(toIndex(Number(e.target.value)))}
            aria-label="Range end ayah"
            className={playerSelectClass()}
          >
            {ayahNumbers.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </span>
      )}
    </div>
  );
}
