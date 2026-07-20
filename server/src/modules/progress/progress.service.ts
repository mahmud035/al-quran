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

/**
 * Record a batch of ayahs as read and apply the day's streak transition.
 *
 * Coverage is OR-ed, so replaying a batch is a no-op and no deduplication is needed
 * anywhere. The day is bucketed in the client's timezone, falling back to UTC when it
 * is absent or invalid rather than rejecting the write (design D5).
 *
 * Mongo has no bitwise operator over Binary, so this is a read-modify-write followed
 * by one atomic upsert. Two flushes landing at the same instant drop the earlier one's
 * bits, and that loss is permanent: a dropped ayah is only recovered if the user reads
 * it again. Concurrency is realistic here — the design targets cross-device reading —
 * so this needs optimistic concurrency (a rev field plus a bounded retry) before the
 * change is archived. Deliberately not a transaction; the retry is the cheaper fix.
 */
const recordAyahs = async (
  userId: string,
  input: RecordAyahsInput,
): Promise<ProgressResponse> => {
  const existing = await UserProgress.findOne({ user: userId }).lean();

  const coverage = setAyahs(existing?.coverage ?? null, input.ayahs);
  const day = localDay(new Date(), input.timezone);
  const streak = applyActivity(toStreakState(existing), day);

  await UserProgress.findOneAndUpdate(
    { user: userId },
    {
      $set: {
        coverage,
        lastActiveDay: streak.lastActiveDay,
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
  );

  return {
    coverage: coverage.toString('base64'),
    khatmahPercent: khatmahPercent(coverage),
    streak: {
      current: displayStreak(streak, day),
      longest: streak.longestStreak,
      lastActiveDay: streak.lastActiveDay,
    },
    lastRead: (existing?.lastRead as ILastRead | null | undefined) ?? null,
  };
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
