import { api } from '@/api/axios';
import { useAuth } from '@/features/auth/useAuth';
import {
  addPending,
  pendingCount,
  restorePending,
  takePending,
} from '@/features/progress/readingBuffer';
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
 * Send everything pending. Ayahs are removed from the buffer before the request and
 * handed back if it fails, so a failure leaves them pending for a later flush rather
 * than losing them. Recording is idempotent server-side, so a retry that duplicates a
 * delivered batch is harmless.
 */
async function flushPending(): Promise<void> {
  if (inFlight) return inFlight;
  if (pendingCount() === 0) return;

  const ayahs = takePending();
  if (ayahs.length === 0) return;

  inFlight = (async () => {
    try {
      await api.post('/progress/ayahs', { ayahs, timezone: clientTimezone() });
      // Streak and percentage have moved; let anything showing them refetch.
      await queryClient.invalidateQueries({ queryKey: PROGRESS_KEY });
    } catch {
      restorePending(ayahs);
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
 * Delivery is best-effort and the browser may drop it; the local-storage mirror is
 * the backstop, retrying on next load.
 */
function flushViaBeacon(): void {
  if (pendingCount() === 0) return;
  if (typeof navigator.sendBeacon !== 'function') {
    void flushPending();
    return;
  }

  const ayahs = takePending();
  if (ayahs.length === 0) return;

  const body = new Blob([JSON.stringify({ ayahs, timezone: clientTimezone() })], {
    type: 'application/json',
  });
  const url = `${api.defaults.baseURL}/progress/ayahs`;

  if (!navigator.sendBeacon(url, body)) restorePending(ayahs);
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
