import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
      <input
        type="search"
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search surahs by name, meaning, or number…"
        className="w-full rounded-xl border border-stone-300 bg-white py-3 pl-10 pr-10 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-slate-200"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
