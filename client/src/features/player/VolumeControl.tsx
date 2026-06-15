import { Volume1, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface VolumeControlProps {
  volume: number; // 0..1
  onChange: (volume: number) => void;
}

/** Volume icon (click to mute/unmute) + a slider to raise/lower playback volume. */
export function VolumeControl({ volume, onChange }: VolumeControlProps) {
  // Remember the last audible level so the mute toggle can restore it.
  const lastAudible = useRef(volume > 0 ? volume : 1);
  useEffect(() => {
    if (volume > 0) lastAudible.current = volume;
  }, [volume]);

  const Icon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const toggleMute = () => onChange(volume === 0 ? lastAudible.current : 0);

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={toggleMute}
        aria-label={volume === 0 ? 'Unmute' : 'Mute'}
        className="rounded-md p-1.5 text-stone-600 hover:bg-stone-100 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <Icon className="h-5 w-5" />
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={volume}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Volume"
        className="h-1.5 w-16 cursor-pointer appearance-none rounded-full bg-stone-200 accent-primary dark:bg-slate-700 sm:w-24"
      />
    </div>
  );
}
