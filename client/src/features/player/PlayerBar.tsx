import { ProgressBar } from '@/features/player/ProgressBar';
import { ReciterSelect } from '@/features/player/ReciterSelect';
import { RepeatControl } from '@/features/player/RepeatControl';
import { SpeedControl } from '@/features/player/SpeedControl';
import { VolumeControl } from '@/features/player/VolumeControl';
import { usePlayer } from '@/features/player/usePlayer';
import { Pause, Play, SkipBack, SkipForward } from 'lucide-react';

/** Persistent bottom audio bar — renders only once a surah is loaded. */
export function PlayerBar() {
  const { state, togglePlay, next, prev, seek, setReciter, setVolume, setRepeat, setPlaybackRate } =
    usePlayer();

  if (state.currentSurah === null || state.playlist.length === 0) return null;

  const total = state.playlist.length;
  const position = state.currentAyahIndex + 1;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200/60 bg-white/80 backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-900/80">
      <div className="mx-auto flex max-w-4xl flex-col gap-2 px-3 py-2 sm:px-4 sm:py-3">
        <ProgressBar currentTime={state.currentTime} duration={state.duration} onSeek={seek} />

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={prev}
            aria-label="Previous ayah"
            className="rounded-full p-2 text-stone-600 hover:bg-stone-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <SkipBack className="h-5 w-5" />
          </button>

          <button
            onClick={togglePlay}
            aria-label={state.isPlaying ? 'Pause' : 'Play'}
            className="rounded-full bg-primary p-2.5 text-white hover:bg-primary-hover"
          >
            {state.isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>

          <button
            onClick={next}
            aria-label="Next ayah"
            className="rounded-full p-2 text-stone-600 hover:bg-stone-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <SkipForward className="h-5 w-5" />
          </button>

          {/* Position label: full text on sm+, compact on mobile */}
          <div className="ml-1 hidden whitespace-nowrap text-sm text-stone-600 dark:text-slate-300 md:block">
            Surah {state.currentSurah}{' '}
            <span className="text-stone-400 dark:text-slate-500">
              • Ayah {position}/{total}
            </span>
          </div>
          <div className="ml-1 whitespace-nowrap text-xs tabular-nums text-stone-500 dark:text-slate-400 md:hidden">
            {position}/{total}
          </div>

          <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
            <SpeedControl rate={state.playbackRate} onChange={setPlaybackRate} />
            <VolumeControl volume={state.volume} onChange={setVolume} />
            <div className="min-w-0 max-w-[40vw] sm:max-w-none">
              <ReciterSelect value={state.reciter} onChange={setReciter} />
            </div>
          </div>
        </div>

        <RepeatControl
          repeat={state.repeat}
          repeatsDone={state.repeatsDone}
          currentAyahIndex={state.currentAyahIndex}
          total={total}
          onChange={setRepeat}
        />
      </div>
    </div>
  );
}
