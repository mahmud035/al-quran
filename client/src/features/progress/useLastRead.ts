import { api } from '@/api/axios';
import { useAuth } from '@/features/auth/useAuth';
import { PROGRESS_KEY, useProgress } from '@/features/progress/useProgress';
import type { LastReadPosition } from '@/types/api';
import { clearLastRead, getLastRead, setLastRead, type LastRead } from '@/utils/lastRead';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

/** What the reader hands back when it unmounts — no timestamp, the store adds it. */
export type ReadingPosition = Omit<LastRead, 'updatedAt'>;

/**
 * Which position wins when a guest signs in (design D8). Pure, so every row of the
 * table is directly testable:
 *
 *   local only              →  push local
 *   server only             →  adopt server
 *   both, local newer       →  push local
 *   both, server newer      →  adopt server
 *   both, local has no ts   →  adopt server
 *   neither                 →  nothing
 *
 * With no server position the local one wins outright, timestamp or not: a record
 * predating timestamping must not be discarded just for being untimestamped. With
 * both present, an untimestamped local record is treated as older and loses.
 */
export function resolveLastRead(
  local: LastRead | null,
  server: LastReadPosition | null,
): 'push-local' | 'adopt-server' | 'none' {
  if (!local) return server ? 'adopt-server' : 'none';
  if (!server) return 'push-local';

  const serverTime = Date.parse(server.updatedAt);
  // An unparseable server timestamp cannot be compared against; prefer the local
  // position rather than silently discarding it.
  if (Number.isNaN(serverTime)) return 'push-local';

  return typeof local.updatedAt === 'number' && local.updatedAt > serverTime
    ? 'push-local'
    : 'adopt-server';
}

/** Send a position to the server. Returns false instead of throwing. */
async function pushToServer(position: ReadingPosition): Promise<boolean> {
  try {
    await api.put('/progress/last-read', position);
    return true;
  } catch {
    return false;
  }
}

/**
 * The last-read position, from whichever store owns it for the current auth state:
 * the server for authenticated users, local storage for guests.
 *
 * An authenticated user whose progress cannot be fetched is offered no position
 * rather than a local value, which may belong to a previous guest session on this
 * device and not to them.
 */
export function useLastRead() {
  const { isAuthenticated } = useAuth();
  const { progress, isLoading, isError } = useProgress();
  const queryClient = useQueryClient();

  // A failed fetch yields no position rather than falling through to local storage:
  // that value may belong to a previous guest session on this device.
  const serverPosition: LastReadPosition | null = isError ? null : (progress?.lastRead ?? null);
  const lastRead: LastRead | null = isAuthenticated
    ? serverPosition && {
        surahNumber: serverPosition.surahNumber,
        surahName: serverPosition.surahName,
        ayahNumber: serverPosition.ayahNumber,
      }
    : getLastRead();

  /**
   * Persist where the user stopped reading. Failures are swallowed by design: losing
   * a resume position must never interrupt or surface an error during reading.
   */
  const save = useCallback(
    async (position: ReadingPosition) => {
      if (isAuthenticated) {
        const ok = await pushToServer(position);
        if (ok) await queryClient.invalidateQueries({ queryKey: PROGRESS_KEY });
        return;
      }
      setLastRead(position);
    },
    [isAuthenticated, queryClient],
  );

  return {
    lastRead,
    // Only meaningful for authenticated users; guests read synchronously.
    isLoading: isAuthenticated ? isLoading : false,
    save,
  };
}

/**
 * Resolve the local and server positions once per sign-in (design D8).
 *
 * The common case is reading as a guest and then signing in, so the more recent of
 * the two wins rather than the server always winning — otherwise signing in silently
 * discards the position the user was just at. A local record with no timestamp
 * predates timestamping and is treated as older than any server position.
 *
 * Either way the local key is cleared afterwards, so exactly one source of truth
 * exists per auth state. That also means a later sign-out leaves no position behind
 * for the next guest session.
 */
export function useLastReadReconciliation(): void {
  const { isAuthenticated } = useAuth();
  const { progress, isLoading, isError } = useProgress();
  const queryClient = useQueryClient();
  const reconciledRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      reconciledRef.current = false; // reset so the next sign-in reconciles again
      return;
    }
    // Wait for a definite answer about the server position; a failed fetch must not
    // be read as "no server position" and cause a stale local push.
    if (isLoading || isError || reconciledRef.current) return;
    reconciledRef.current = true;

    const local = getLastRead();
    const outcome = resolveLastRead(local, progress?.lastRead ?? null);

    if (outcome === 'none') return;

    if (outcome === 'adopt-server') {
      clearLastRead();
      return;
    }

    void pushToServer({
      surahNumber: local!.surahNumber,
      surahName: local!.surahName,
      ayahNumber: local!.ayahNumber,
    }).then(async (ok) => {
      if (!ok) {
        reconciledRef.current = false; // leave the local copy and retry later
        return;
      }
      // Only give up the local copy once the server actually has it.
      clearLastRead();
      await queryClient.invalidateQueries({ queryKey: PROGRESS_KEY });
    });
  }, [isAuthenticated, isLoading, isError, progress, queryClient]);
}
