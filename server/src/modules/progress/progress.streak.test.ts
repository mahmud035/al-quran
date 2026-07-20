import { describe, expect, it } from 'vitest';
import {
  StreakState,
  applyActivity,
  displayStreak,
  localDay,
  nextDay,
} from './progress.streak';

const state = (
  lastActiveDay: string | null,
  currentStreak: number,
  longestStreak: number,
): StreakState => ({ lastActiveDay, currentStreak, longestStreak });

const NEW_USER: StreakState = state(null, 0, 0);

describe('localDay', () => {
  it('attributes evening reading to the local calendar day', () => {
    // 2026-07-20T18:30Z is 2026-07-21 00:30 in Dhaka (UTC+6).
    const instant = new Date('2026-07-20T18:30:00Z');
    expect(localDay(instant, 'Asia/Dhaka')).toBe('2026-07-21');
    expect(localDay(instant, 'UTC')).toBe('2026-07-20');
  });

  it('gives each zone its own calendar date at the same instant', () => {
    // Same instant, different calendar dates either side of the date line.
    const instant = new Date('2026-07-20T11:00:00Z');
    expect(localDay(instant, 'Asia/Dhaka')).toBe('2026-07-20');
    expect(localDay(instant, 'Pacific/Auckland')).toBe('2026-07-20');

    const later = new Date('2026-07-20T13:00:00Z');
    expect(localDay(later, 'Asia/Dhaka')).toBe('2026-07-20');
    expect(localDay(later, 'Pacific/Auckland')).toBe('2026-07-21');
  });

  it('falls back to UTC for an invalid timezone instead of throwing', () => {
    const instant = new Date('2026-07-20T18:30:00Z');
    expect(localDay(instant, 'Not/AZone')).toBe('2026-07-20');
    expect(localDay(instant, 'nonsense')).toBe('2026-07-20');
  });

  it('falls back to UTC when the timezone is absent', () => {
    const instant = new Date('2026-07-20T18:30:00Z');
    expect(localDay(instant, undefined)).toBe('2026-07-20');
    expect(localDay(instant, null)).toBe('2026-07-20');
    expect(localDay(instant, '')).toBe('2026-07-20');
  });

  it('buckets a daylight saving transition day without duplicating or skipping', () => {
    // US spring forward: 2026-03-08, clocks jump 02:00 → 03:00 in America/New_York.
    const zone = 'America/New_York';
    const days = [
      new Date('2026-03-07T18:00:00Z'), // Sat 13:00 EST
      new Date('2026-03-08T06:00:00Z'), // Sun 01:00 EST — before the jump
      new Date('2026-03-08T08:00:00Z'), // Sun 04:00 EDT — after the jump
      new Date('2026-03-09T15:00:00Z'), // Mon 11:00 EDT
    ].map((instant) => localDay(instant, zone));

    expect(days).toEqual(['2026-03-07', '2026-03-08', '2026-03-08', '2026-03-09']);

    // The DST day is one day wide, exactly like any other.
    expect(nextDay('2026-03-07')).toBe('2026-03-08');
    expect(nextDay('2026-03-08')).toBe('2026-03-09');
  });

  it('buckets an autumn fall-back day the same way', () => {
    // US fall back: 2026-11-01, 02:00 EDT → 01:00 EST.
    const zone = 'America/New_York';
    expect(localDay(new Date('2026-11-01T05:30:00Z'), zone)).toBe('2026-11-01'); // 01:30 EDT
    expect(localDay(new Date('2026-11-01T06:30:00Z'), zone)).toBe('2026-11-01'); // 01:30 EST
    expect(nextDay('2026-10-31')).toBe('2026-11-01');
    expect(nextDay('2026-11-01')).toBe('2026-11-02');
  });
});

describe('nextDay', () => {
  it('advances within a month', () => {
    expect(nextDay('2026-07-20')).toBe('2026-07-21');
  });

  it('crosses a month boundary', () => {
    expect(nextDay('2026-07-31')).toBe('2026-08-01');
    expect(nextDay('2026-04-30')).toBe('2026-05-01');
  });

  it('crosses a year boundary', () => {
    expect(nextDay('2026-12-31')).toBe('2027-01-01');
  });

  it('handles leap and non-leap February', () => {
    expect(nextDay('2028-02-28')).toBe('2028-02-29');
    expect(nextDay('2028-02-29')).toBe('2028-03-01');
    expect(nextDay('2026-02-28')).toBe('2026-03-01');
  });
});

describe('applyActivity', () => {
  it('starts a new user at a streak of 1', () => {
    const next = applyActivity(NEW_USER, '2026-07-20');
    expect(next).toEqual(state('2026-07-20', 1, 1));
  });

  it('leaves the streak unchanged on a second reading the same day', () => {
    const first = applyActivity(NEW_USER, '2026-07-20');
    const second = applyActivity(first, '2026-07-20');
    expect(second.currentStreak).toBe(1);
    expect(second.lastActiveDay).toBe('2026-07-20');
  });

  it('increments on consecutive days', () => {
    const next = applyActivity(state('2026-07-19', 4, 9), '2026-07-20');
    expect(next.currentStreak).toBe(5);
    expect(next.lastActiveDay).toBe('2026-07-20');
  });

  it('restarts at 1 after a gap', () => {
    const next = applyActivity(state('2026-07-17', 7, 7), '2026-07-20');
    expect(next.currentStreak).toBe(1);
    expect(next.lastActiveDay).toBe('2026-07-20');
  });

  it('does not resurrect a lapsed streak', () => {
    const lapsed = state('2026-07-10', 5, 5);
    expect(applyActivity(lapsed, '2026-07-20').currentStreak).toBe(1);
  });

  it('increments across a month boundary', () => {
    expect(applyActivity(state('2026-07-31', 3, 3), '2026-08-01').currentStreak).toBe(4);
  });

  it('increments across a year boundary', () => {
    expect(applyActivity(state('2026-12-31', 3, 3), '2027-01-01').currentStreak).toBe(4);
  });

  it('raises the longest streak when the current one passes it', () => {
    const next = applyActivity(state('2026-07-19', 9, 9), '2026-07-20');
    expect(next.currentStreak).toBe(10);
    expect(next.longestStreak).toBe(10);
  });

  it('retains the longest streak after a break', () => {
    const next = applyActivity(state('2026-07-01', 12, 12), '2026-07-20');
    expect(next.currentStreak).toBe(1);
    expect(next.longestStreak).toBe(12);
  });

  it('ignores a day earlier than the last active day', () => {
    // Westward travel: the local day goes backwards. The streak must not break.
    const before = state('2026-07-20', 6, 8);
    const after = applyActivity(before, '2026-07-19');
    expect(after).toEqual(before);
  });

  it('does not mutate the state it was given', () => {
    const before = state('2026-07-19', 4, 4);
    applyActivity(before, '2026-07-20');
    expect(before).toEqual(state('2026-07-19', 4, 4));
  });

  it('counts an eastward then westward trip as one continuous streak', () => {
    // Dhaka → Auckland (day jumps ahead), then back west (day repeats).
    let s = applyActivity(NEW_USER, '2026-07-19');
    s = applyActivity(s, '2026-07-20');
    s = applyActivity(s, '2026-07-19'); // westward: ignored
    s = applyActivity(s, '2026-07-21');
    expect(s.currentStreak).toBe(3);
    expect(s.lastActiveDay).toBe('2026-07-21');
  });
});

describe('displayStreak', () => {
  it('shows the stored streak when the user read today', () => {
    expect(displayStreak(state('2026-07-20', 5, 9), '2026-07-20')).toBe(5);
  });

  it('shows the stored streak when the user read yesterday', () => {
    expect(displayStreak(state('2026-07-19', 5, 9), '2026-07-20')).toBe(5);
  });

  it('shows 0 once the streak has lapsed', () => {
    expect(displayStreak(state('2026-07-17', 5, 9), '2026-07-20')).toBe(0);
  });

  it('shows 0 for a user who has never read', () => {
    expect(displayStreak(NEW_USER, '2026-07-20')).toBe(0);
  });

  it('spans a month boundary when the last active day is yesterday', () => {
    expect(displayStreak(state('2026-07-31', 5, 5), '2026-08-01')).toBe(5);
    expect(displayStreak(state('2026-12-31', 5, 5), '2027-01-01')).toBe(5);
  });

  it('keeps the streak live when the last active day is ahead of today', () => {
    // Westward traveller reading their progress from a zone a day behind.
    expect(displayStreak(state('2026-07-21', 5, 5), '2026-07-20')).toBe(5);
  });

  it('does not mutate state', () => {
    const before = state('2026-07-10', 5, 9);
    displayStreak(before, '2026-07-20');
    expect(before).toEqual(state('2026-07-10', 5, 9));
  });
});
