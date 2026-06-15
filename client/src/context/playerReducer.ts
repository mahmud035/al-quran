import type { Reciter } from '@/types/api';
import { DEFAULT_RECITER } from '@/utils/constants';

export interface PlayerState {
  currentSurah: number | null;
  currentAyahIndex: number;
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  reciter: Reciter;
  /** Playback volume, 0..1. */
  volume: number;
  /** 128/64kbps CDN URLs, one per ayah. */
  playlist: string[];
  /** Global ayah numbers backing the playlist (kept so we can rebuild on reciter switch). */
  globalAyahNumbers: number[];
}

export type PlayerAction =
  | { type: 'LOAD_SURAH'; surah: number; globalAyahNumbers: number[]; playlist: string[]; index: number }
  | { type: 'SET_INDEX'; index: number }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'NEXT' }
  | { type: 'PREV' }
  | { type: 'SET_TIME'; currentTime: number; duration: number }
  | { type: 'SET_RECITER'; reciter: Reciter; playlist: string[] }
  | { type: 'SET_VOLUME'; volume: number }
  | { type: 'STOP' };

export const initialPlayerState: PlayerState = {
  currentSurah: null,
  currentAyahIndex: 0,
  isPlaying: false,
  duration: 0,
  currentTime: 0,
  reciter: DEFAULT_RECITER,
  volume: 1,
  playlist: [],
  globalAyahNumbers: [],
};

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
      };
    case 'SET_INDEX':
      return { ...state, currentAyahIndex: action.index, isPlaying: true };
    case 'PLAY':
      return { ...state, isPlaying: true };
    case 'PAUSE':
      return { ...state, isPlaying: false };
    case 'NEXT': {
      const next = state.currentAyahIndex + 1;
      if (next >= state.playlist.length) {
        // End of surah → stop and reset to the first ayah.
        return { ...state, isPlaying: false, currentAyahIndex: 0 };
      }
      return { ...state, currentAyahIndex: next, isPlaying: true };
    }
    case 'PREV':
      return {
        ...state,
        currentAyahIndex: Math.max(0, state.currentAyahIndex - 1),
        isPlaying: true,
      };
    case 'SET_TIME':
      return { ...state, currentTime: action.currentTime, duration: action.duration };
    case 'SET_RECITER':
      return { ...state, reciter: action.reciter, playlist: action.playlist };
    case 'SET_VOLUME':
      return { ...state, volume: Math.min(1, Math.max(0, action.volume)) };
    case 'STOP':
      return { ...state, isPlaying: false, currentAyahIndex: 0, currentTime: 0 };
    default:
      return state;
  }
}
