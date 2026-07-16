// "Continue Reading" position — stored in localStorage only (no DB write on scroll).

const KEY = 'qm:last-read';

export interface LastRead {
  surahNumber: number;
  surahName: string; // English name, for the chip label
  ayahNumber: number;
}

function isLastRead(value: unknown): value is LastRead {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as LastRead).surahNumber === 'number' &&
    typeof (value as LastRead).surahName === 'string' &&
    typeof (value as LastRead).ayahNumber === 'number'
  );
}

export function getLastRead(): LastRead | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isLastRead(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function setLastRead(value: LastRead): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // ignore
  }
}
