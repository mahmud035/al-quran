import { MAX_TOASTS, toastQueueReducer, type Toast } from '@/providers/toastQueue';
import { describe, expect, it } from 'vitest';

const add = (id: string, message: string, raisedAt: number) =>
  ({ type: 'ADD', id, message, raisedAt }) as const;

const queue = (...toasts: Toast[]) => toasts;

describe('toastQueueReducer', () => {
  it('appends a distinct message', () => {
    const state = toastQueueReducer([], add('a', 'first', 1));
    expect(toastQueueReducer(state, add('b', 'second', 2))).toEqual([
      { id: 'a', message: 'first', raisedAt: 1 },
      { id: 'b', message: 'second', raisedAt: 2 },
    ]);
  });

  it('refreshes the existing entry when the same message is raised again', () => {
    const state = toastQueueReducer([], add('a', 'same', 1));
    const next = toastQueueReducer(state, add('b', 'same', 50));

    expect(next).toHaveLength(1);
    expect(next[0].id).toBe('a'); // the showing message, not a replacement
    expect(next[0].raisedAt).toBe(50); // its lifetime restarts
  });

  it('drops the oldest once the cap is exceeded', () => {
    let state: Toast[] = [];
    for (let n = 1; n <= MAX_TOASTS; n += 1) {
      state = toastQueueReducer(state, add(`t${n}`, `message ${n}`, n));
    }
    expect(state).toHaveLength(MAX_TOASTS);

    const next = toastQueueReducer(state, add('newest', 'newest message', 99));

    expect(next).toHaveLength(MAX_TOASTS);
    expect(next.at(-1)?.id).toBe('newest');
    expect(next.some((toast) => toast.id === 't1')).toBe(false);
  });

  it('dismisses by id and leaves the others untouched', () => {
    const state = queue(
      { id: 'a', message: 'first', raisedAt: 1 },
      { id: 'b', message: 'second', raisedAt: 2 },
    );

    expect(toastQueueReducer(state, { type: 'DISMISS', id: 'a' })).toEqual([
      { id: 'b', message: 'second', raisedAt: 2 },
    ]);
  });

  it('expires by id', () => {
    const state = queue({ id: 'a', message: 'first', raisedAt: 1 });
    expect(toastQueueReducer(state, { type: 'EXPIRE', id: 'a' })).toEqual([]);
  });

  it('treats an unknown id as a no-op', () => {
    const state = queue({ id: 'a', message: 'first', raisedAt: 1 });
    expect(toastQueueReducer(state, { type: 'DISMISS', id: 'gone' })).toBe(state);
  });
});
