import type { Reciter } from '@/types/api';
import { RECITERS } from '@/utils/constants';

interface ReciterSelectProps {
  value: Reciter;
  onChange: (reciter: Reciter) => void;
}

export function ReciterSelect({ value, onChange }: ReciterSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Reciter)}
      aria-label="Reciter"
      className="w-full max-w-full truncate rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs text-stone-700 focus:border-primary focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
    >
      {RECITERS.map((r) => (
        <option key={r.value} value={r.value}>
          {r.label}
        </option>
      ))}
    </select>
  );
}
