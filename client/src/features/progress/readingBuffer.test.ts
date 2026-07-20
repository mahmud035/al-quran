// @vitest-environment jsdom
// Per-file rather than global: this is the only suite needing a DOM, and the existing
// pure suites stay on the faster node environment.
import {
  MAX_PENDING,
  addPending,
  clearPending,
  pendingCount,
  resetPendingForTests,
  restorePending,
  takePending,
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
    expect(takePending()).toEqual([5]);
  });

  it('mirrors to local storage on every add', () => {
    addPending(5);
    addPending(6);
    expect(JSON.parse(window.localStorage.getItem(KEY)!)).toEqual([5, 6]);
  });

  it('recovers pending ayahs written by a previous session', () => {
    window.localStorage.setItem(KEY, JSON.stringify([10, 20, 30]));
    resetPendingForTests();
    expect(pendingCount()).toBe(3);
    expect(takePending()).toEqual([10, 20, 30]);
  });

  it('treats an unparseable mirror as empty rather than throwing', () => {
    window.localStorage.setItem(KEY, 'not json');
    resetPendingForTests();
    expect(pendingCount()).toBe(0);
  });

  it('discards mirror entries that are not valid ayah numbers', () => {
    window.localStorage.setItem(KEY, JSON.stringify([5, 'x', null, 0, 6237, 1.5, 6236]));
    resetPendingForTests();
    expect(takePending()).toEqual([5, 6236]);
  });

  it('empties the buffer and the mirror on take', () => {
    addPending(5);
    expect(takePending()).toEqual([5]);
    expect(pendingCount()).toBe(0);
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it('issues nothing to send when no ayahs are pending', () => {
    expect(takePending()).toEqual([]);
  });

  it('puts ayahs back after a failed send', () => {
    addPending(5);
    const sent = takePending();
    expect(pendingCount()).toBe(0);

    restorePending(sent);
    expect(pendingCount()).toBe(1);
    expect(JSON.parse(window.localStorage.getItem(KEY)!)).toEqual([5]);
  });

  it('merges restored ayahs ahead of ones buffered while the send was in flight', () => {
    addPending(1);
    const sent = takePending();
    addPending(2); // qualified while the request was outstanding
    restorePending(sent);
    expect(takePending()).toEqual([1, 2]);
  });

  it('accepts the newest ayah at the cap and drops the oldest', () => {
    for (let n = 1; n <= MAX_PENDING; n += 1) addPending(n);
    expect(pendingCount()).toBe(MAX_PENDING);

    addPending(9999);

    const values = takePending();
    expect(values).toHaveLength(MAX_PENDING);
    expect(values).toContain(9999); // newest accepted
    expect(values).not.toContain(1); // oldest dropped
    expect(values[0]).toBe(2);
  });

  it('bounds the buffer when a restore would overflow it', () => {
    const tooMany = Array.from({ length: MAX_PENDING + 10 }, (_, i) => i + 1);
    restorePending(tooMany);
    expect(pendingCount()).toBe(MAX_PENDING);
  });

  it('clears everything on sign-out', () => {
    addPending(5);
    clearPending();
    expect(pendingCount()).toBe(0);
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });
});
