import { api } from '@/api/axios';
import { useAuth } from '@/features/auth/useAuth';
import { addPending, peekPending, removePending } from '@/features/progress/readingBuffer';
import { PROGRESS_KEY, clientTimezone } from '@/features/progress/useProgress';
import { queryClient } from '@/lib/queryClient';
import { FLUSH_INTERVAL_MS } from '@/utils/constants';
import { useCallback, useEffect } from 'react';

/**
 * Only one flush is ever outstanding. Without this, the pagehide beacon racing the
 * interval — or the recovery flush racing the first interval — would have both send
 * overlapping batches, and the server's read-modify-write on coverage would drop one
 * side's bits. Queueing behind the in-flight request costs nothing here.
 */
let inFlight: Promise<void> | null = null;

/**
 * Send everything pending. The batch is snapshotted but not removed until the server
 * confirms it: on success exactly that batch is dropped, on failure nothing is, so an
 * interrupted or rejected flush leaves the ayahs pending for a later flush rather than
 * losing them. Recording is idempotent server-side, so a retry that duplicates a
 * delivered batch is harmless.
 *
 * Not draining the buffer up front is what makes this survive a page teardown: a fetch
 * has no `keepalive`, so it is cancelled mid-unload, but because the ayahs are still
 * pending the `pagehide` beacon can see and re-send them, and the mirror still holds
 * them for next-load recovery. Ayahs added while the request is in flight are outside
 * the snapshot and are kept.
 *
 * Exported for tests; the app reaches it only through the hooks below.
 */
export async function flushPending(): Promise<void> {
  if (inFlight) return inFlight;

  const ayahs = peekPending();
  if (ayahs.length === 0) return;

  inFlight = (async () => {
    try {
      await api.post('/progress/ayahs', { ayahs, timezone: clientTimezone() });
      removePending(ayahs);
      // Streak and percentage have moved; let anything showing them refetch.
      await queryClient.invalidateQueries({ queryKey: PROGRESS_KEY });
    } catch {
      // Leave the snapshot pending; the mirror still holds it, so the next flush or
      // next-load recovery retries.
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/**
 * Exit flush. `sendBeacon` survives the page being torn down, where a normal request
 * would be cancelled. The auth cookie is HTTP-only and rides along automatically —
 * that is precisely why this works here, since a beacon cannot set headers.
 *
 * This deliberately does NOT consume the buffer. `sendBeacon` reports only that the
 * browser queued the request, never that the server accepted it, so a beacon that is
 * dropped by the browser or rejected by the server — a 409 once the write's retry
 * budget is exhausted — must leave the ayahs pending. The local-storage mirror is the
 * backstop: the next confirmed flush (the interval, the reader unmount, or recovery on
 * next load) re-sends them. Recording is idempotent, so a beacon that *did* land just
 * makes that re-send a no-op. Consuming here would silently lose exactly the reads
 * this exit flush exists to save.
 *
 * Exported for tests; the app reaches it only through useReadingSync.
 */
export function flushViaBeacon(): void {
  const ayahs = peekPending();
  if (ayahs.length === 0) return;
  if (typeof navigator.sendBeacon !== 'function') {
    // No beacon support: fall back to a normal flush. It may be cancelled mid-unload,
    // but flushPending restores on failure and the mirror still holds everything.
    void flushPending();
    return;
  }

  const body = new Blob([JSON.stringify({ ayahs, timezone: clientTimezone() })], {
    type: 'application/json',
  });
  const url = `${api.defaults.baseURL}/progress/ayahs`;

  // If the browser will not even queue it, the ayahs are still in the mirror for the
  // next load to recover — there is nothing to undo.
  navigator.sendBeacon(url, body);
}

/**
 * Record a qualifying ayah as read.
 *
 * Inert for guests: no buffering, no mirror write, no request. The gate sits here
 * rather than at flush time so an unauthenticated session never touches storage at
 * all.
 */
export function useRecordReading() {
  const { isAuthenticated } = useAuth();

  const recordAyah = useCallback(
    (globalAyahNumber: number) => {
      if (!isAuthenticated) return;
      addPending(globalAyahNumber);
    },
    [isAuthenticated],
  );

  // Leaving the reader is a natural batch boundary — send without waiting for the
  // next interval tick.
  useEffect(() => {
    if (!isAuthenticated) return;
    return () => {
      void flushPending();
    };
  }, [isAuthenticated]);

  return { recordAyah };
}

/**
 * The app-wide flush lifecycle: recovery on load, a periodic flush while ayahs are
 * pending, and exit flushes. Mount exactly once (see ProgressSync) — mounting it
 * twice would run two intervals.
 */
export function useReadingSync(): void {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;

    // Anything mirrored by a previous session is already pending, so this delivers
    // it before the session buffers anything new.
    void flushPending();

    const interval = window.setInterval(() => {
      void flushPending();
    }, FLUSH_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushViaBeacon();
    };

    // visibilitychange is fired at the document; pagehide at the window.
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', flushViaBeacon);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', flushViaBeacon);
    };
  }, [isAuthenticated]);
}
