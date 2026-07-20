import type { Reciter } from '@/types/api';
import {
  initialPlayerState,
  playerReducer,
  type PlayerState,
  type RepeatMode,
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
  setRepeat: (repeat: RepeatMode) => void;
  setPlaybackRate: (playbackRate: number) => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const PlayerContext = createContext<PlayerContextValue | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(playerReducer, initialPlayerState);
  const audioRef = useRef<HTMLAudioElement>(null);

  const currentUrl = state.playlist[state.currentAyahIndex];
  const { replayToken } = state;
  const loadedUrlRef = useRef<string | undefined>(undefined);

  // Load the source whenever the current ayah's URL changes, then resume if playing.
  // A replayToken bump with the same URL is a repeat: seek to 0 and play instead of
  // re-assigning src and calling load(), which would refetch and stall the loop.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentUrl) return;
    if (loadedUrlRef.current === currentUrl) {
      audio.currentTime = 0;
    } else {
      loadedUrlRef.current = currentUrl;
      audio.src = currentUrl;
      audio.load();
    }
    if (state.isPlaying) {
      audio.play().catch(() => undefined);
    }
    // Only react to URL and replay changes here; play/pause toggling is handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUrl, replayToken]);

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

  // Reflect speed onto the element. Unlike volume, playbackRate is reset from
  // defaultPlaybackRate by the media load algorithm, so both must be set for the rate
  // to survive the load() on every ayah transition.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.defaultPlaybackRate = state.playbackRate;
    audio.playbackRate = state.playbackRate;
  }, [state.playbackRate]);

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

  const setRepeat = useCallback((repeat: RepeatMode) => {
    dispatch({ type: 'SET_REPEAT', repeat });
  }, []);

  const setPlaybackRate = useCallback((playbackRate: number) => {
    dispatch({ type: 'SET_PLAYBACK_RATE', playbackRate });
  }, []);

  const value = useMemo<PlayerContextValue>(
    () => ({
      state,
      playSurah,
      playAyah,
      togglePlay,
      next,
      prev,
      seek,
      setReciter,
      setVolume,
      setRepeat,
      setPlaybackRate,
    }),
    [
      state,
      playSurah,
      playAyah,
      togglePlay,
      next,
      prev,
      seek,
      setReciter,
      setVolume,
      setRepeat,
      setPlaybackRate,
    ],
  );

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        onEnded={() => dispatch({ type: 'TRACK_ENDED' })}
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
