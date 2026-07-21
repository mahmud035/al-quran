// @vitest-environment jsdom
import {
  addPending,
  peekPending,
  pendingCount,
  resetPendingForTests,
} from '@/features/progress/readingBuffer';
import { flushViaBeacon } from '@/features/progress/useRecordReading';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const KEY = 'qm:pending-ayahs';

function stubBeacon(returnValue = true) {
  const beacon = vi.fn().mockReturnValue(returnValue);
  Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true });
  return beacon;
}

describe('flushViaBeacon', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetPendingForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // jsdom has no sendBeacon of its own; remove the stub so it does not leak.
    Reflect.deleteProperty(navigator, 'sendBeacon');
  });

  it('sends the pending ayahs via sendBeacon as a JSON blob', async () => {
    const beacon = stubBeacon();
    addPending(5);
    addPending(6);

    flushViaBeacon();

    expect(beacon).toHaveBeenCalledTimes(1);
    const [url, body] = beacon.mock.calls[0] as [string, Blob];
    expect(url).toContain('/progress/ayahs');
    expect(body.type).toBe('application/json');
    expect(JSON.parse(await body.text()).ayahs).toEqual([5, 6]);
  });

  it('does NOT consume the buffer, so a dropped or 409ed beacon is retried later', () => {
    // The fix: sendBeacon reports only that the browser queued the request, never that
    // the server accepted it, so the ayahs must stay pending for the next confirmed
    // flush. Consuming here would silently lose them on a 409 or a dropped beacon.
    stubBeacon(true);
    addPending(5);
    addPending(6);

    flushViaBeacon();

    expect(pendingCount()).toBe(2);
    expect(peekPending()).toEqual([5, 6]);
    expect(JSON.parse(window.localStorage.getItem(KEY)!)).toEqual([5, 6]);
  });

  it('leaves the buffer intact even when the browser refuses to queue the beacon', () => {
    stubBeacon(false);
    addPending(7);

    flushViaBeacon();

    expect(peekPending()).toEqual([7]);
  });

  it('issues no beacon when nothing is pending', () => {
    const beacon = stubBeacon();
    flushViaBeacon();
    expect(beacon).not.toHaveBeenCalled();
  });
});
