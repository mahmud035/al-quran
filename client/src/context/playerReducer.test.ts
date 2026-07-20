import { initialPlayerState, playerReducer, type PlayerState } from '@/context/playerReducer';
import { describe, expect, it } from 'vitest';

/** State with a 5-ayah playlist (indices 0..4), playing at `index`. */
function stateAt(index: number, overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    ...initialPlayerState,
    currentSurah: 1,
    playlist: ['a0', 'a1', 'a2', 'a3', 'a4'],
    globalAyahNumbers: [1, 2, 3, 4, 5],
    currentAyahIndex: index,
    isPlaying: true,
    ...overrides,
  };
}

describe('NEXT', () => {
  it('advances to the following ayah', () => {
    const next = playerReducer(stateAt(1), { type: 'NEXT' });
    expect(next.currentAyahIndex).toBe(2);
    expect(next.isPlaying).toBe(true);
  });

  it('stops and resets to the first ayah at the end of the surah', () => {
    const next = playerReducer(stateAt(4), { type: 'NEXT' });
    expect(next.currentAyahIndex).toBe(0);
    expect(next.isPlaying).toBe(false);
  });
});

describe('PREV', () => {
  it('rewinds one ayah', () => {
    expect(playerReducer(stateAt(3), { type: 'PREV' }).currentAyahIndex).toBe(2);
  });

  it('clamps at the first ayah', () => {
    expect(playerReducer(stateAt(0), { type: 'PREV' }).currentAyahIndex).toBe(0);
  });
});

describe('LOAD_SURAH', () => {
  it('resets repeat state, since bounds index the outgoing playlist', () => {
    const armed = stateAt(3, { repeat: { kind: 'range', start: 2, end: 4, count: 2 }, repeatsDone: 1 });
    const next = playerReducer(armed, {
      type: 'LOAD_SURAH',
      surah: 108,
      globalAyahNumbers: [6205, 6206, 6207],
      playlist: ['b0', 'b1', 'b2'],
      index: 0,
    });
    expect(next.repeat).toEqual({ kind: 'off' });
    expect(next.repeatsDone).toBe(0);
  });

  it('resets a counted ayah repeat too, not just ranges', () => {
    const armed = stateAt(3, { repeat: { kind: 'ayah', count: 3 }, repeatsDone: 1 });
    const next = playerReducer(armed, {
      type: 'LOAD_SURAH',
      surah: 108,
      globalAyahNumbers: [6205, 6206, 6207],
      playlist: ['b0', 'b1', 'b2'],
      index: 0,
    });
    expect(next.repeat).toEqual({ kind: 'off' });
    expect(next.repeatsDone).toBe(0);
  });
});

describe('SET_REPEAT', () => {
  it('replaces the previous mode and resets the counter', () => {
    const armed = stateAt(1, { repeat: { kind: 'ayah', count: 3 }, repeatsDone: 2 });
    const next = playerReducer(armed, { type: 'SET_REPEAT', repeat: { kind: 'surah' } });
    expect(next.repeat).toEqual({ kind: 'surah' });
    expect(next.repeatsDone).toBe(0);
  });

  it('defaults to off', () => {
    expect(initialPlayerState.repeat).toEqual({ kind: 'off' });
    expect(initialPlayerState.repeatsDone).toBe(0);
  });
});

describe('TRACK_ENDED with repeat off', () => {
  it('advances mid-surah', () => {
    expect(playerReducer(stateAt(1), { type: 'TRACK_ENDED' }).currentAyahIndex).toBe(2);
  });

  it('stops and resets to the first ayah at the end of the surah', () => {
    const next = playerReducer(stateAt(4), { type: 'TRACK_ENDED' });
    expect(next.currentAyahIndex).toBe(0);
    expect(next.isPlaying).toBe(false);
  });
});

describe('TRACK_ENDED with repeat-ayah', () => {
  const repeat = { kind: 'ayah', count: 3 } as const;

  it('replays the same ayah before the count is reached', () => {
    const next = playerReducer(stateAt(1, { repeat }), { type: 'TRACK_ENDED' });
    expect(next.currentAyahIndex).toBe(1);
    expect(next.repeatsDone).toBe(1);
    expect(next.replayToken).toBe(1);
  });

  it('advances and resets the counter once the count is reached', () => {
    const next = playerReducer(stateAt(1, { repeat, repeatsDone: 2 }), { type: 'TRACK_ENDED' });
    expect(next.currentAyahIndex).toBe(2);
    expect(next.repeatsDone).toBe(0);
  });

  it('applies end-of-surah behaviour on the last ayah once the count is reached', () => {
    const next = playerReducer(stateAt(4, { repeat, repeatsDone: 2 }), { type: 'TRACK_ENDED' });
    expect(next.currentAyahIndex).toBe(0);
    expect(next.isPlaying).toBe(false);
  });

  it('never advances under an unbounded count', () => {
    let state = stateAt(1, { repeat: { kind: 'ayah', count: Infinity } });
    for (let i = 0; i < 50; i++) state = playerReducer(state, { type: 'TRACK_ENDED' });
    expect(state.currentAyahIndex).toBe(1);
    expect(state.repeatsDone).toBe(50);
  });

  it('keeps repeating at the last ayah under an unbounded count', () => {
    const unbounded = stateAt(4, { repeat: { kind: 'ayah', count: Infinity }, repeatsDone: 9 });
    const next = playerReducer(unbounded, { type: 'TRACK_ENDED' });
    expect(next.currentAyahIndex).toBe(4);
    expect(next.isPlaying).toBe(true);
    expect(next.replayToken).toBe(1);
  });

  it('resets the counter when the user jumps to a different ayah', () => {
    const next = playerReducer(stateAt(1, { repeat, repeatsDone: 1 }), {
      type: 'SET_INDEX',
      index: 3,
    });
    expect(next.repeatsDone).toBe(0);
    expect(next.repeat).toEqual(repeat);
  });

  it('advances without repeating when the user presses next', () => {
    const next = playerReducer(stateAt(1, { repeat, repeatsDone: 1 }), { type: 'NEXT' });
    expect(next.currentAyahIndex).toBe(2);
    expect(next.repeatsDone).toBe(0);
  });
});

describe('TRACK_ENDED with repeat-range', () => {
  // Ayahs 3–7 in the spec are indices 2–6 in a longer playlist.
  const playlist = Array.from({ length: 10 }, (_, i) => `a${i}`);
  const range = { kind: 'range', start: 2, end: 6, count: 2 } as const;
  const inRange = (index: number, repeatsDone = 0) =>
    stateAt(index, { playlist, repeat: range, repeatsDone });

  it('advances inside the range', () => {
    expect(playerReducer(inRange(3), { type: 'TRACK_ENDED' }).currentAyahIndex).toBe(4);
  });

  it('loops back to the start when passes remain', () => {
    const next = playerReducer(inRange(6), { type: 'TRACK_ENDED' });
    expect(next.currentAyahIndex).toBe(2);
    expect(next.isPlaying).toBe(true);
    expect(next.repeatsDone).toBe(1);
  });

  it('stops at the end once the count is exhausted', () => {
    const next = playerReducer(inRange(6, 1), { type: 'TRACK_ENDED' });
    expect(next.currentAyahIndex).toBe(6);
    expect(next.isPlaying).toBe(false);
  });

  it('stays armed with a zeroed counter after completing', () => {
    const next = playerReducer(inRange(6, 1), { type: 'TRACK_ENDED' });
    expect(next.repeat).toEqual(range);
    expect(next.repeatsDone).toBe(0);
  });

  it('plays a single-ayah range its full count and then stops', () => {
    const single = { kind: 'range', start: 2, end: 2, count: 3 } as const;
    let state = stateAt(2, { playlist, repeat: single });
    state = playerReducer(state, { type: 'TRACK_ENDED' });
    expect(state.currentAyahIndex).toBe(2);
    expect(state.replayToken).toBe(1);
    state = playerReducer(state, { type: 'TRACK_ENDED' });
    expect(state.replayToken).toBe(2);
    state = playerReducer(state, { type: 'TRACK_ENDED' });
    expect(state.isPlaying).toBe(false);
    expect(state.currentAyahIndex).toBe(2);
  });

  it('clears the range when the user jumps outside it', () => {
    const next = playerReducer(inRange(4), { type: 'SET_INDEX', index: 11 });
    expect(next.repeat).toEqual({ kind: 'off' });
    expect(next.currentAyahIndex).toBe(11);
  });

  it('keeps the range when the user jumps inside it', () => {
    const next = playerReducer(inRange(3, 1), { type: 'SET_INDEX', index: 4 });
    expect(next.repeat).toEqual(range);
    expect(next.repeatsDone).toBe(0);
  });

  it('clears the range when next steps past its end', () => {
    expect(playerReducer(inRange(6), { type: 'NEXT' }).repeat).toEqual({ kind: 'off' });
  });

  it('clears the range when prev steps before its start', () => {
    expect(playerReducer(inRange(2), { type: 'PREV' }).repeat).toEqual({ kind: 'off' });
  });
});

describe('TRACK_ENDED with loop-surah', () => {
  const repeat = { kind: 'surah' } as const;

  it('advances mid-surah', () => {
    expect(playerReducer(stateAt(1, { repeat }), { type: 'TRACK_ENDED' }).currentAyahIndex).toBe(2);
  });

  it('wraps to the first ayah and keeps playing at the end', () => {
    const next = playerReducer(stateAt(4, { repeat }), { type: 'TRACK_ENDED' });
    expect(next.currentAyahIndex).toBe(0);
    expect(next.isPlaying).toBe(true);
  });

  it('survives manual navigation', () => {
    expect(playerReducer(stateAt(2, { repeat }), { type: 'SET_INDEX', index: 0 }).repeat).toEqual(
      repeat,
    );
    expect(playerReducer(stateAt(2, { repeat }), { type: 'PREV' }).currentAyahIndex).toBe(1);
  });
});

describe('SET_RECITER', () => {
  it('carries repeat state through unchanged', () => {
    const range = { kind: 'range', start: 2, end: 6, count: 2 } as const;
    const armed = stateAt(3, { repeat: range, repeatsDone: 1 });
    const next = playerReducer(armed, {
      type: 'SET_RECITER',
      reciter: 'ar.hanirifai',
      playlist: armed.playlist,
    });
    expect(next.repeat).toEqual(range);
    expect(next.repeatsDone).toBe(1);
    expect(next.currentAyahIndex).toBe(3);
  });
});
