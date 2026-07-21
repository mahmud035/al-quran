// @vitest-environment jsdom
// Per-file rather than global: this is the only kind of suite needing a DOM, and the
// existing pure suites stay on the faster node environment.
import {
  MAX_PENDING,
  addPending,
  clearPending,
  peekPending,
  pendingCount,
  removePending,
  resetPendingForTests,
} from '@/features/progress/readingBuffer';
import { beforeEach, describe, expect, it } from 'vitest';

const KEY = 'qm:pending-ayahs';

beforeEach(() => {
  window.localStorage.clear();
  resetPendingForTests();
});

describe('readingBuffer', () => {
  it('accumulates ayahs and reports the count', () => {
    addPending(5);
    addPending(6);
    expect(pendingCount()).toBe(2);
  });

  it('ignores an ayah that is already pending', () => {
    addPending(5);
    addPending(5);
    expect(pendingCount()).toBe(1);
    expect(peekPending()).toEqual([5]);
  });

  it('mirrors to local storage on every add', () => {
    addPending(5);
    addPending(6);
    expect(JSON.parse(window.localStorage.getItem(KEY)!)).toEqual([5, 6]);
  });

  it('peeks without consuming, so the buffer survives an unconfirmed flush', () => {
    addPending(5);
    addPending(6);
    expect(peekPending()).toEqual([5, 6]);
    expect(peekPending()).toEqual([5, 6]); // still there — peek never drains
    expect(pendingCount()).toBe(2);
    expect(JSON.parse(window.localStorage.getItem(KEY)!)).toEqual([5, 6]);
  });

  it('recovers pending ayahs written by a previous session', () => {
    window.localStorage.setItem(KEY, JSON.stringify([10, 20, 30]));
    resetPendingForTests();
    expect(peekPending()).toEqual([10, 20, 30]);
  });

  it('treats an unparseable mirror as empty rather than throwing', () => {
    window.localStorage.setItem(KEY, 'not json');
    resetPendingForTests();
    expect(pendingCount()).toBe(0);
  });

  it('discards mirror entries that are not valid ayah numbers', () => {
    window.localStorage.setItem(KEY, JSON.stringify([5, 'x', null, 0, 6237, 1.5, 6236]));
    resetPendingForTests();
    expect(peekPending()).toEqual([5, 6236]);
  });

  it('removes exactly the confirmed batch and clears the mirror when it empties', () => {
    addPending(5);
    removePending([5]);
    expect(pendingCount()).toBe(0);
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it('keeps ayahs added while a flush was in flight', () => {
    // A flush snapshots [1]; then 2 qualifies before the server confirms. Removing the
    // confirmed snapshot must not drop 2.
    addPending(1);
    const snapshot = peekPending();
    addPending(2);
    removePending(snapshot);
    expect(peekPending()).toEqual([2]);
    expect(JSON.parse(window.localStorage.getItem(KEY)!)).toEqual([2]);
  });

  it('ignores unknown ayahs when removing a batch', () => {
    addPending(5);
    removePending([9999]);
    expect(peekPending()).toEqual([5]);
  });

  it('accepts the newest ayah at the cap and drops the oldest', () => {
    for (let n = 1; n <= MAX_PENDING; n += 1) addPending(n);
    expect(pendingCount()).toBe(MAX_PENDING);

    addPending(9999);

    const values = peekPending();
    expect(values).toHaveLength(MAX_PENDING);
    expect(values).toContain(9999); // newest accepted
    expect(values).not.toContain(1); // oldest dropped
    expect(values[0]).toBe(2);
  });

  it('clears everything on sign-out', () => {
    addPending(5);
    clearPending();
    expect(pendingCount()).toBe(0);
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });
});
