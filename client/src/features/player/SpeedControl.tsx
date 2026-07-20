import { playerSelectClass } from '@/features/player/controlStyles';
import { PLAYBACK_RATES } from '@/utils/constants';

interface SpeedControlProps {
  rate: number;
  onChange: (rate: number) => void;
}

/** Playback speed picker. Ringed active whenever the rate is not 1. */
export function SpeedControl({ rate, onChange }: SpeedControlProps) {
  return (
    <select
      value={rate}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-label="Playback speed"
      className={`${playerSelectClass(rate !== 1)} tabular-nums`}
    >
      {PLAYBACK_RATES.map((r) => (
        <option key={r} value={r}>
          {r}×
        </option>
      ))}
    </select>
  );
}
