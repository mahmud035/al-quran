/**
 * Streak arithmetic (design D5–D7).
 *
 * Every value here is a date-only `YYYY-MM-DD` string. No wall-clock or hour
 * arithmetic is performed anywhere, which makes the whole module immune to daylight
 * saving by construction. These functions are pure — the only clock reading is the
 * instant the caller passes in — so every transition is directly unit-testable.
 */

/** A date-only calendar day, `YYYY-MM-DD`. */
export type CalendarDay = string;

export interface StreakState {
  lastActiveDay: CalendarDay | null;
  currentStreak: number;
  longestStreak: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** `en-CA` renders dates as YYYY-MM-DD, so no date library is needed. */
const dayFormatter = (timeZone: string): Intl.DateTimeFormat =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

/**
 * The calendar day an instant falls on in the given IANA timezone.
 *
 * An absent or invalid zone falls back to UTC rather than throwing (design D5):
 * losing a day's streak accuracy is a better failure than losing the reading record,
 * so this never propagates an error to the caller.
 */
export const localDay = (instant: Date, timezone?: string | null): CalendarDay => {
  if (timezone) {
    try {
      return dayFormatter(timezone).format(instant);
    } catch {
      // Invalid IANA zone — Intl throws RangeError. Fall through to UTC.
    }
  }
  return dayFormatter('UTC').format(instant);
};

/**
 * The day after the given day. The value is date-only, so it is parsed as UTC
 * midnight, advanced by 24h, and reformatted — never as wall-clock time.
 */
export const nextDay = (day: CalendarDay): CalendarDay =>
  new Date(Date.parse(`${day}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10);

/**
 * Apply a recording on local day `D` to streak state, returning new state.
 *
 * The four transitions of design D6:
 *
 *   lastActiveDay === null       →  streak starts at 1
 *   D === lastActiveDay          →  no change (already counted today)
 *   D === lastActiveDay + 1 day  →  streak increments
 *   D  >  lastActiveDay + 1 day  →  streak restarts at 1 (broken, not resumed)
 *   D  <  lastActiveDay          →  no change (clock skew / westward travel)
 *
 * The `D < lastActiveDay` case must never decrement or break the streak: a user
 * flying east and then west would otherwise be punished for travelling.
 * `longestStreak` is raised whenever the current streak passes it, and is never
 * lowered by a break.
 */
export const applyActivity = (state: StreakState, day: CalendarDay): StreakState => {
  const { lastActiveDay } = state;

  // Date-only strings sort lexicographically, so plain comparison is date comparison.
  if (lastActiveDay !== null && day < lastActiveDay) return state;
  if (lastActiveDay === day) return state;

  let currentStreak: number;
  if (lastActiveDay === null) {
    currentStreak = 1;
  } else if (day === nextDay(lastActiveDay)) {
    currentStreak = state.currentStreak + 1;
  } else {
    currentStreak = 1;
  }

  return {
    lastActiveDay: day,
    currentStreak,
    longestStreak: Math.max(state.longestStreak, currentStreak),
  };
};

/**
 * The streak to show for `today`, computed at read time and never stored (design D7).
 *
 * `currentStreak` in storage is the value as of `lastActiveDay`, so a user who stops
 * reading keeps a stale value there. A streak is still live only if the last active
 * day is today or yesterday; otherwise it has lapsed and displays as 0. This does not
 * mutate state — a read never changes the stored streak.
 *
 * A `lastActiveDay` later than `today` is treated as live for the same reason
 * `applyActivity` ignores an earlier day: a westward traveller must not be shown a
 * broken streak for crossing a date line.
 */
export const displayStreak = (state: StreakState, today: CalendarDay): number => {
  const { lastActiveDay } = state;
  if (lastActiveDay === null) return 0;
  if (lastActiveDay >= today) return state.currentStreak;
  if (nextDay(lastActiveDay) === today) return state.currentStreak;
  return 0;
};
