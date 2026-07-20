import type { Reciter } from '@/types/api';
import { DEFAULT_RECITER } from '@/utils/constants';

/**
 * Active repeat mode. `start`/`end` are playlist indices (index === numberInSurah - 1);
 * the UI converts to ayah numbers at its boundary. `count` is a total play count and
 * accepts `Infinity` for unbounded repeat-ayah.
 */
export type RepeatMode =
  | { kind: 'off' }
  | { kind: 'ayah'; count: number }
  | { kind: 'range'; start: number; end: number; count: number }
  | { kind: 'surah' };

export interface PlayerState {
  currentSurah: number | null;
  currentAyahIndex: number;
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  reciter: Reciter;
  /** Playback volume, 0..1. */
  volume: number;
  /** Playback speed multiplier. Session-only — never persisted. */
  playbackRate: number;
  /** 128/64kbps CDN URLs, one per ayah. */
  playlist: string[];
  /** Global ayah numbers backing the playlist (kept so we can rebuild on reciter switch). */
  globalAyahNumbers: number[];
  /** Active repeat mode. Session-only — never persisted. */
  repeat: RepeatMode;
  /** Plays completed at the current position (or passes completed over the current range). */
  repeatsDone: number;
  /**
   * Bumped whenever the reducer decides to replay the ayah already at `currentAyahIndex`.
   * Repeating an ayah leaves the current URL unchanged, so the src effect — keyed on that
   * URL — would never re-run and the replay would silently not happen. This token gives it
   * something to react to. Do not "simplify" it away.
   */
  replayToken: number;
}

export type PlayerAction =
  | { type: 'LOAD_SURAH'; surah: number; globalAyahNumbers: number[]; playlist: string[]; index: number }
  | { type: 'SET_INDEX'; index: number }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'NEXT' }
  | { type: 'PREV' }
  /** The audio element finished a track. Distinct from NEXT, which is user intent to advance. */
  | { type: 'TRACK_ENDED' }
  | { type: 'SET_REPEAT'; repeat: RepeatMode }
  | { type: 'SET_TIME'; currentTime: number; duration: number }
  | { type: 'SET_RECITER'; reciter: Reciter; playlist: string[] }
  | { type: 'SET_VOLUME'; volume: number }
  | { type: 'SET_PLAYBACK_RATE'; playbackRate: number }
  | { type: 'STOP' };

export const initialPlayerState: PlayerState = {
  currentSurah: null,
  currentAyahIndex: 0,
  isPlaying: false,
  duration: 0,
  currentTime: 0,
  reciter: DEFAULT_RECITER,
  volume: 1,
  playbackRate: 1,
  playlist: [],
  globalAyahNumbers: [],
  repeat: { kind: 'off' },
  repeatsDone: 0,
  replayToken: 0,
};

/** Advance one ayah; at the end of the surah stop and reset to the first ayah. */
function advance(state: PlayerState): PlayerState {
  const next = state.currentAyahIndex + 1;
  if (next >= state.playlist.length) {
    return { ...state, isPlaying: false, currentAyahIndex: 0 };
  }
  return { ...state, currentAyahIndex: next, isPlaying: true };
}

/**
 * Apply a manual index move: the counter resets, and a range whose playhead has been
 * moved outside it is cleared — a range loop positioned outside its own bounds has no
 * coherent meaning. Ayah and surah repeat survive manual navigation.
 */
function afterManualMove(state: PlayerState): PlayerState {
  const cleared =
    state.repeat.kind === 'range' &&
    (state.currentAyahIndex < state.repeat.start || state.currentAyahIndex > state.repeat.end);
  return {
    ...state,
    repeatsDone: 0,
    repeat: cleared ? { kind: 'off' } : state.repeat,
  };
}

export function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case 'LOAD_SURAH':
      return {
        ...state,
        currentSurah: action.surah,
        globalAyahNumbers: action.globalAyahNumbers,
        playlist: action.playlist,
        currentAyahIndex: action.index,
        isPlaying: true,
        // Repeat bounds are indices into the outgoing playlist, so they mean nothing
        // against a new surah's. Start clean rather than carry a stale range over.
        repeat: { kind: 'off' },
        repeatsDone: 0,
      };
    case 'SET_INDEX':
      return afterManualMove({ ...state, currentAyahIndex: action.index, isPlaying: true });
    case 'PLAY':
      return { ...state, isPlaying: true };
    case 'PAUSE':
      return { ...state, isPlaying: false };
    case 'NEXT':
      return afterManualMove(advance(state));
    case 'PREV':
      return afterManualMove({
        ...state,
        currentAyahIndex: Math.max(0, state.currentAyahIndex - 1),
        isPlaying: true,
      });
    case 'SET_REPEAT':
      return { ...state, repeat: action.repeat, repeatsDone: 0 };
    case 'TRACK_ENDED': {
      const { repeat, repeatsDone, currentAyahIndex } = state;
      switch (repeat.kind) {
        case 'off':
          return advance(state);
        case 'ayah':
          if (repeatsDone + 1 < repeat.count) {
            return { ...state, repeatsDone: repeatsDone + 1, replayToken: state.replayToken + 1 };
          }
          return { ...advance(state), repeatsDone: 0 };
        case 'range':
          if (currentAyahIndex < repeat.end) {
            return { ...state, currentAyahIndex: currentAyahIndex + 1, isPlaying: true };
          }
          if (repeatsDone + 1 < repeat.count) {
            // Loop back to the start of the range. A single-ayah range replays in place,
            // leaving the URL unchanged, so it needs the replay token.
            return {
              ...state,
              currentAyahIndex: repeat.start,
              isPlaying: true,
              repeatsDone: repeatsDone + 1,
              replayToken:
                repeat.start === currentAyahIndex ? state.replayToken + 1 : state.replayToken,
            };
          }
          // Count exhausted: stop at `end` and leave the range armed for another run.
          return { ...state, isPlaying: false, repeatsDone: 0 };
        case 'surah': {
          const wrapped = currentAyahIndex + 1 >= state.playlist.length ? 0 : currentAyahIndex + 1;
          return {
            ...state,
            currentAyahIndex: wrapped,
            isPlaying: true,
            replayToken:
              wrapped === currentAyahIndex ? state.replayToken + 1 : state.replayToken,
          };
        }
      }
      return state;
    }
    case 'SET_TIME':
      return { ...state, currentTime: action.currentTime, duration: action.duration };
    case 'SET_RECITER':
      return { ...state, reciter: action.reciter, playlist: action.playlist };
    case 'SET_VOLUME':
      return { ...state, volume: Math.min(1, Math.max(0, action.volume)) };
    case 'SET_PLAYBACK_RATE':
      return { ...state, playbackRate: action.playbackRate };
    case 'STOP':
      return { ...state, isPlaying: false, currentAyahIndex: 0, currentTime: 0 };
    default:
      return state;
  }
}
