import { AppError } from '../../utils/AppError';
import { khatmahPercent, normalizeCoverage, setAyahs } from './progress.coverage';
import { ILastRead, ProgressResponse, StreakState } from './progress.interface';
import { UserProgress } from './progress.model';
import { applyActivity, displayStreak, localDay } from './progress.streak';
import { LastReadInput, RecordAyahsInput } from './progress.validation';

/** Pull the streak fields out of a document (or defaults) as a plain state value. */
const toStreakState = (doc: {
  lastActiveDay?: string | null;
  currentStreak?: number;
  longestStreak?: number;
} | null): StreakState => ({
  lastActiveDay: doc?.lastActiveDay ?? null,
  currentStreak: doc?.currentStreak ?? 0,
  longestStreak: doc?.longestStreak ?? 0,
});

/**
 * Read the user's progress.
 *
 * An absent document means zero coverage, no streak, and no last-read — no document
 * is created by a read. The streak returned is the *display* streak computed against
 * the caller's timezone, so a lapsed streak reports 0 instead of its stale stored
 * value (design D7). Stored state is never mutated here.
 */
const getProgress = async (
  userId: string,
  timezone?: string,
): Promise<ProgressResponse> => {
  const doc = await UserProgress.findOne({ user: userId }).lean();

  // A .lean() read yields BSON Binary rather than a Buffer; normalize before use.
  const coverage = normalizeCoverage(doc?.coverage);
  const streak = toStreakState(doc);
  const today = localDay(new Date(), timezone);

  return {
    coverage: coverage.toString('base64'),
    khatmahPercent: khatmahPercent(coverage),
    streak: {
      current: displayStreak(streak, today),
      longest: streak.longestStreak,
      lastActiveDay: streak.lastActiveDay,
    },
    lastRead: (doc?.lastRead as ILastRead | null | undefined) ?? null,
  };
};

/** Attempts before giving up on a contended write. */
const MAX_RECORD_ATTEMPTS = 8;

/**
 * Wait a short jittered interval before retrying a lost race.
 *
 * Without the jitter every loser re-reads at the same instant and collides again, so
 * heavy contention exhausts the attempt budget in lockstep rather than draining. The
 * backoff grows with the attempt number to spread a large pile-up.
 */
const backoff = (attempt: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 20) * (attempt + 1) + 5));

/** Mongo's duplicate-key error, raised when two inserts race on the unique user index. */
const isDuplicateKeyError = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;

/**
 * Record a batch of ayahs as read and apply the day's streak transition.
 *
 * Coverage is OR-ed, so replaying a batch is a no-op and no deduplication is needed
 * anywhere. The day is bucketed in the client's timezone, falling back to UTC when it
 * is absent or invalid rather than rejecting the write (design D5).
 *
 * Mongo has no bitwise operator over Binary, so the OR has to happen in application
 * code: read, modify, write. A concurrent flush would overwrite an in-flight cycle and
 * silently drop its bits, permanently — a dropped ayah is only recovered if the user
 * reads it again. Since the design targets cross-device reading, that race is
 * realistic, so the write is guarded by `rev`: the update only applies if the document
 * has not changed since it was read, and a losing attempt re-reads and retries against
 * the winner's coverage. Cheaper and more predictable than a transaction.
 */
const recordAyahs = async (
  userId: string,
  input: RecordAyahsInput,
): Promise<ProgressResponse> => {
  const day = localDay(new Date(), input.timezone);

  for (let attempt = 0; attempt < MAX_RECORD_ATTEMPTS; attempt += 1) {
    const existing = await UserProgress.findOne({ user: userId }).lean();

    const coverage = setAyahs(existing?.coverage, input.ayahs);
    const streak = applyActivity(toStreakState(existing), day);

    const result: ProgressResponse = {
      coverage: coverage.toString('base64'),
      khatmahPercent: khatmahPercent(coverage),
      streak: {
        current: displayStreak(streak, day),
        longest: streak.longestStreak,
        lastActiveDay: streak.lastActiveDay,
      },
      lastRead: (existing?.lastRead as ILastRead | null | undefined) ?? null,
    };

    if (!existing) {
      try {
        await UserProgress.create({
          user: userId,
          coverage,
          lastActiveDay: streak.lastActiveDay,
          currentStreak: streak.currentStreak,
          longestStreak: streak.longestStreak,
          rev: 1,
        });
        return result;
      } catch (error) {
        // Another request inserted first; go round again and apply as an update.
        if (!isDuplicateKeyError(error)) throw error;
        await backoff(attempt);
        continue;
      }
    }

    // `null` in $in also matches a missing field, so a document written before `rev`
    // existed is treated as rev 0 rather than being unmatchable.
    const expectedRev = existing.rev ?? 0;
    const updated = await UserProgress.findOneAndUpdate(
      { user: userId, rev: expectedRev === 0 ? { $in: [0, null] } : expectedRev },
      {
        $set: {
          coverage,
          lastActiveDay: streak.lastActiveDay,
          currentStreak: streak.currentStreak,
          longestStreak: streak.longestStreak,
        },
        $inc: { rev: 1 },
      },
      { new: true, runValidators: true },
    ).lean();

    if (updated) return result;

    // Lost the race: another write landed between the read and the update. Re-read
    // and reapply this batch on top of theirs.
    await backoff(attempt);
  }

  throw new AppError(
    409,
    'Could not record reading due to concurrent updates. Please try again.',
  );
};

/**
 * Set the user's last-read position.
 *
 * This deliberately does not touch coverage or the streak: "where do I resume" and
 * "what have I read" are different questions, and conflating them would credit ayahs
 * the user never reached (design D9).
 */
const setLastRead = async (userId: string, input: LastReadInput): Promise<ILastRead> => {
  const lastRead: ILastRead = { ...input, updatedAt: new Date() };

  await UserProgress.findOneAndUpdate(
    { user: userId },
    { $set: { lastRead } },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
  );

  return lastRead;
};

export const progressService = {
  getProgress,
  recordAyahs,
  setLastRead,
};
