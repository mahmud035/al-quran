// "Continue Reading" position for guests. Authenticated users are server-owned —
// see features/progress/useLastRead.ts, which selects the store by auth state.

const KEY = 'qm:last-read';

export interface LastRead {
  surahNumber: number;
  surahName: string; // English name, for the chip label
  ayahNumber: number;
  /**
   * Epoch milliseconds, used only to resolve local against server on sign-in.
   * Optional: records written before this field existed remain valid, and are
   * treated as older than any server position.
   */
  updatedAt?: number;
}

function hasRequiredFields(value: unknown): value is LastRead {
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
    if (!hasRequiredFields(parsed)) return null;

    // A malformed timestamp must not invalidate an otherwise good record: drop it
    // and let the record be treated as untimestamped.
    const { surahNumber, surahName, ayahNumber, updatedAt } = parsed;
    return {
      surahNumber,
      surahName,
      ayahNumber,
      ...(typeof updatedAt === 'number' && Number.isFinite(updatedAt) ? { updatedAt } : {}),
    };
  } catch {
    return null;
  }
}

/** Write the guest position, stamping it so sign-in can resolve it by recency. */
export function setLastRead(value: Omit<LastRead, 'updatedAt'>): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...value, updatedAt: Date.now() }));
  } catch {
    // Quota exceeded or storage disabled — reading must never break because the
    // position could not be saved.
  }
}

/** Drop the local position once it is server-owned, so there is one source of truth. */
export function clearLastRead(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
