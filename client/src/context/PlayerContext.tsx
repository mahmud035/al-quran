import type { Reciter } from '@/types/api';
import {
  initialPlayerState,
  playerReducer,
  type PlayerState,
} from '@/context/playerReducer';
import { buildPlaylist } from '@/utils/buildPlaylist';
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';

export interface PlayerContextValue {
  state: PlayerState;
  /** Load a surah's playlist and start from ayah 1. */
  playSurah: (surah: number, globalAyahNumbers: number[]) => void;
  /** Play a specific ayah (loads the surah first if it isn't the current one). */
  playAyah: (surah: number, globalAyahNumbers: number[], index: number) => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seek: (time: number) => void;
  setReciter: (reciter: Reciter) => void;
  setVolume: (volume: number) => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const PlayerContext = createContext<PlayerContextValue | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(playerReducer, initialPlayerState);
  const audioRef = useRef<HTMLAudioElement>(null);

  const currentUrl = state.playlist[state.currentAyahIndex];

  // Load the source whenever the current ayah's URL changes, then resume if playing.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentUrl) return;
    audio.src = currentUrl;
    audio.load();
    if (state.isPlaying) {
      audio.play().catch(() => undefined);
    }
    // Only react to URL changes here; play/pause toggling is handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUrl]);

  // Reflect play/pause state onto the element.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (state.isPlaying) audio.play().catch(() => undefined);
    else audio.pause();
  }, [state.isPlaying]);

  // Reflect volume onto the element (persists across src changes).
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = state.volume;
  }, [state.volume]);

  const playSurah = useCallback(
    (surah: number, globalAyahNumbers: number[]) => {
      dispatch({
        type: 'LOAD_SURAH',
        surah,
        globalAyahNumbers,
        playlist: buildPlaylist(globalAyahNumbers, state.reciter),
        index: 0,
      });
    },
    [state.reciter],
  );

  const playAyah = useCallback(
    (surah: number, globalAyahNumbers: number[], index: number) => {
      if (state.currentSurah === surah && state.playlist.length) {
        dispatch({ type: 'SET_INDEX', index });
      } else {
        dispatch({
          type: 'LOAD_SURAH',
          surah,
          globalAyahNumbers,
          playlist: buildPlaylist(globalAyahNumbers, state.reciter),
          index,
        });
      }
    },
    [state.currentSurah, state.playlist.length, state.reciter],
  );

  const togglePlay = useCallback(() => {
    dispatch({ type: state.isPlaying ? 'PAUSE' : 'PLAY' });
  }, [state.isPlaying]);

  const next = useCallback(() => dispatch({ type: 'NEXT' }), []);
  const prev = useCallback(() => dispatch({ type: 'PREV' }), []);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (audio) audio.currentTime = time;
  }, []);

  // Switch reciter mid-playback: rebuild playlist for the new reciter, keep the index.
  const setReciter = useCallback(
    (reciter: Reciter) => {
      dispatch({
        type: 'SET_RECITER',
        reciter,
        playlist: buildPlaylist(state.globalAyahNumbers, reciter),
      });
    },
    [state.globalAyahNumbers],
  );

  const setVolume = useCallback((volume: number) => {
    dispatch({ type: 'SET_VOLUME', volume });
  }, []);

  const value = useMemo<PlayerContextValue>(
    () => ({ state, playSurah, playAyah, togglePlay, next, prev, seek, setReciter, setVolume }),
    [state, playSurah, playAyah, togglePlay, next, prev, seek, setReciter, setVolume],
  );

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        onEnded={() => dispatch({ type: 'NEXT' })}
        onTimeUpdate={(e) =>
          dispatch({
            type: 'SET_TIME',
            currentTime: e.currentTarget.currentTime,
            duration: e.currentTarget.duration || 0,
          })
        }
        onLoadedMetadata={(e) =>
          dispatch({
            type: 'SET_TIME',
            currentTime: e.currentTarget.currentTime,
            duration: e.currentTarget.duration || 0,
          })
        }
      />
    </PlayerContext.Provider>
  );
}
