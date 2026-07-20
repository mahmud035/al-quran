import { useReadingSync } from '@/features/progress/useRecordReading';

/**
 * Owns the app-wide reading-flush lifecycle: recovering reads mirrored by a previous
 * session, flushing on an interval while ayahs are pending, and flushing on exit.
 *
 * It lives here rather than in the reader so that reads buffered during a session are
 * still delivered after the user navigates away from the surah, and so that a
 * recovered mirror is retried on app load even if no surah is ever opened. Headless —
 * renders nothing.
 */
export function ProgressSync() {
  useReadingSync();
  return null;
}
