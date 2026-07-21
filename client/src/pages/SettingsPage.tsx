import { FontSizeControl } from '@/components/ui/FontSizeControl';
import { useAuth } from '@/features/auth/useAuth';
import { usePlayer } from '@/features/player/usePlayer';
import { useSettings } from '@/features/settings/useSettings';
import { useThemeSetting } from '@/features/settings/useThemeSetting';
import type { Reciter, Theme, TranslationEdition } from '@/types/api';
import { RECITERS, TRANSLATIONS } from '@/utils/constants';
import type { ReactNode } from 'react';

interface Option<T> {
  value: T;
  label: string;
}

function OptionRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            value === opt.value
              ? 'bg-primary text-white'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-slate-400">
        {title}
      </h2>
      {children}
    </section>
  );
}

const THEME_OPTIONS: Option<Theme>[] = [
  { value: 'system', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function SettingsPage() {
  const { isAuthenticated } = useAuth();
  const { preferences, updatePreferences } = useSettings();
  const { preference: themePreference, setTheme } = useThemeSetting();
  const player = usePlayer();

  const setReciterPref = (next: Reciter) => {
    void updatePreferences({ reciter: next });
    player.setReciter(next); // keep the live player in sync
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <h1 className="text-2xl font-bold text-stone-800 dark:text-slate-100">Settings</h1>

      {!isAuthenticated && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
          You’re browsing as a guest — preferences are saved on this device only. Log in to sync
          them across devices.
        </p>
      )}

      <Section title="Translation">
        <OptionRow
          options={TRANSLATIONS as Option<TranslationEdition>[]}
          value={preferences.translationEdition}
          onChange={(translationEdition) => void updatePreferences({ translationEdition })}
        />
      </Section>

      <Section title="Reciter">
        <OptionRow options={RECITERS} value={preferences.reciter} onChange={setReciterPref} />
      </Section>

      <Section title="Arabic font size">
        <FontSizeControl
          value={preferences.fontSize}
          onChange={(fontSize) => void updatePreferences({ fontSize })}
        />
      </Section>

      <Section title="Theme">
        <OptionRow options={THEME_OPTIONS} value={themePreference} onChange={setTheme} />
      </Section>
    </div>
  );
}
