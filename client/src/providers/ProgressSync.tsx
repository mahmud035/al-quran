import { useLastReadReconciliation } from '@/features/progress/useLastRead';
import { useReadingSync } from '@/features/progress/useRecordReading';

/**
 * App-level sync for the progress domain. Headless — renders nothing.
 *
 * Two lifecycles, both of which have to outlive the reader:
 *
 * - The reading-flush lifecycle: recovering reads mirrored by a previous session,
 *   flushing on an interval while ayahs are pending, and flushing on exit. It lives
 *   here so buffered reads still deliver after the user navigates away from a surah,
 *   and so a recovered mirror is retried on app load even if no surah is opened.
 * - Last-read reconciliation, which runs once per sign-in.
 */
export function ProgressSync() {
  useReadingSync();
  useLastReadReconciliation();
  return null;
}
