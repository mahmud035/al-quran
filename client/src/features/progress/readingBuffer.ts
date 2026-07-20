/**
 * Pending reads awaiting delivery to the server.
 *
 * A module-level singleton rather than React state, for two reasons: the pending set
 * must survive the reader unmounting and remounting, and a `pagehide` handler has to
 * reach it synchronously while the page is being torn down.
 *
 * Every mutation is mirrored to local storage, so a flush that fails, is dropped by
 * the browser, or never happens because the tab closed is retried on next load rather
 * than lost. Recording is idempotent server-side, so a duplicate retry costs nothing.
 */

const KEY = 'qm:pending-ayahs';

/**
 * Cap on pending ayahs. Above any plausible single session (the longest surah is 286
 * ayahs) and far under the storage quota. On overflow the oldest entries are dropped:
 * losing some coverage is strictly better than stalling recording.
 */
export const MAX_PENDING = 2000;

/** Insertion-ordered, which is what makes "drop the oldest" a first-key delete. */
let pending: Set<number> | null = null;

/** Read the mirror. Anything malformed is treated as an empty mirror, never thrown. */
function readMirror(): number[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (n): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 6236,
    );
  } catch {
    return [];
  }
}

function writeMirror(): void {
  try {
    const values = [...(pending ?? [])];
    if (values.length === 0) window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, JSON.stringify(values));
  } catch {
    // Quota exceeded or storage disabled — recording must not break because the
    // mirror could not be written.
  }
}

/**
 * Load the mirror on first touch, so reads recovered from a previous session are
 * already pending before any new ayah is accepted.
 */
function ensureLoaded(): Set<number> {
  if (pending === null) pending = new Set(readMirror());
  return pending;
}

/** Add a qualifying ayah, evicting the oldest entry if the buffer is at its cap. */
export function addPending(globalAyahNumber: number): void {
  const set = ensureLoaded();
  if (set.has(globalAyahNumber)) return;

  if (set.size >= MAX_PENDING) {
    const oldest = set.values().next();
    if (!oldest.done) set.delete(oldest.value);
  }

  set.add(globalAyahNumber);
  writeMirror();
}

/** How many ayahs are waiting to be sent. */
export function pendingCount(): number {
  return ensureLoaded().size;
}

/**
 * Remove and return everything pending, ready to send. The caller owns them from
 * here: on a failed send it must hand them back via restorePending.
 */
export function takePending(): number[] {
  const set = ensureLoaded();
  const values = [...set];
  set.clear();
  writeMirror();
  return values;
}

/**
 * Return ayahs to the buffer after a failed send. They go to the front so that the
 * cap still evicts genuinely-oldest entries first.
 */
export function restorePending(ayahs: number[]): void {
  const set = ensureLoaded();
  const merged = [...ayahs, ...set];
  const kept = merged.slice(Math.max(0, merged.length - MAX_PENDING));
  pending = new Set(kept);
  writeMirror();
}

/** Drop everything, in memory and in the mirror. Used on sign-out. */
export function clearPending(): void {
  pending = new Set();
  writeMirror();
}

/** Test seam: forget the in-memory set so the next access re-reads the mirror. */
export function resetPendingForTests(): void {
  pending = null;
}
