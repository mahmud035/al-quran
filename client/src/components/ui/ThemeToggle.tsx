import { useThemeSetting } from '@/features/settings/useThemeSetting';
import type { Theme } from '@/types/api';
import { Monitor, Moon, Sun } from 'lucide-react';

const OPTIONS: { value: Theme; label: string }[] = [
  { value: 'system', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

/**
 * Theme picker for the navbar.
 *
 * A native `<select>` laid transparently over the icon, rather than a custom menu:
 * the navbar hides every label below `sm:`, so a text control would be the only words
 * there and would eat scarce width, but a hand-rolled listbox would mean writing
 * roving focus and key handling by hand. The select keeps the icon-sized footprint and
 * gets keyboard navigation, screen-reader semantics, and the platform's own dropdown
 * for free. `focus-within` restores the focus ring the transparent select would
 * otherwise hide.
 */
export function ThemeToggle() {
  const { preference, resolvedTheme, setTheme } = useThemeSetting();
  const Icon = preference === 'system' ? Monitor : resolvedTheme === 'dark' ? Sun : Moon;

  return (
    <div className="relative flex rounded-lg text-stone-600 focus-within:ring-2 focus-within:ring-primary hover:bg-stone-100 dark:text-slate-300 dark:focus-within:ring-accent dark:hover:bg-slate-800">
      <Icon className="pointer-events-none m-2 h-5 w-5" aria-hidden="true" />
      <select
        value={preference}
        onChange={(event) => setTheme(event.target.value as Theme)}
        aria-label="Theme"
        // The colours are invisible on the transparent trigger, but some browsers
        // paint the popup from the element's own background rather than from the
        // inherited `color-scheme`.
        className="absolute inset-0 cursor-pointer bg-white text-stone-700 opacity-0 dark:bg-slate-800 dark:text-slate-200"
      >
        {OPTIONS.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="bg-white text-stone-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
