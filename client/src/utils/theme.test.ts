// @vitest-environment jsdom
import {
  applyTheme,
  getStoredTheme,
  resolveSystemTheme,
  resolveThemePreference,
  setStoredTheme,
  subscribeToSystemTheme,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ServerTheme,
} from '@/utils/theme';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const UNFETCHED: ServerTheme = { status: 'unfetched' };
const fetched = (theme: 'system' | 'light' | 'dark'): ServerTheme => ({
  status: 'fetched',
  theme,
});

/**
 * jsdom has no matchMedia; every test that resolves `system` needs one. The returned
 * `emit` fires a scheme change at whatever the code subscribed with.
 */
function stubMatchMedia(prefersDark: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const query = {
    matches: prefersDark,
    addEventListener: vi.fn((_: string, handler: (event: MediaQueryListEvent) => void) =>
      listeners.add(handler),
    ),
    removeEventListener: vi.fn((_: string, handler: (event: MediaQueryListEvent) => void) =>
      listeners.delete(handler),
    ),
  };
  Object.defineProperty(window, 'matchMedia', {
    value: vi.fn().mockReturnValue(query),
    configurable: true,
  });
  return {
    query,
    emit: (dark: boolean) => {
      query.matches = dark;
      listeners.forEach((handler) => handler({ matches: dark } as MediaQueryListEvent));
    },
    listenerCount: () => listeners.size,
  };
}

describe('resolveThemePreference', () => {
  it('takes the server value when the settings request succeeded', () => {
    expect(resolveThemePreference(fetched('dark'), 'light', false)).toBe('dark');
  });

  it('leaves the cache standing while the settings request is unresolved', () => {
    // The reported bug: a pending request used to surface DEFAULTS.theme = 'light'
    // and overwrite a real preference.
    expect(resolveThemePreference(UNFETCHED, 'dark', false)).toBe('dark');
  });

  it('leaves the cache standing when the settings request failed', () => {
    // A failure is `unfetched` too — there is no separate "errored" branch to get
    // wrong, which is the point of the two-state type.
    expect(resolveThemePreference(UNFETCHED, 'dark', false)).toBe('dark');
  });

  it('uses the cache for a guest, who has no server value at all', () => {
    expect(resolveThemePreference(UNFETCHED, 'dark', false)).toBe('dark');
  });

  it('keeps a choice made this session despite a later server value', () => {
    expect(resolveThemePreference(fetched('light'), 'dark', true)).toBe('dark');
  });

  it('applies the server value when the user has made no choice this session', () => {
    expect(resolveThemePreference(fetched('dark'), 'light', false)).toBe('dark');
  });

  it('falls back to system when nothing is cached and nothing is fetched', () => {
    expect(resolveThemePreference(UNFETCHED, null, false)).toBe('system');
  });

  it('falls back to system when a session choice somehow left no cached value', () => {
    expect(resolveThemePreference(UNFETCHED, null, true)).toBe('system');
  });
});

describe('getStoredTheme', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads a valid cached preference', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    expect(getStoredTheme()).toBe('dark');
  });

  it('reads system as a preference in its own right', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'system');
    expect(getStoredTheme()).toBe('system');
  });

  it('returns null when nothing is cached', () => {
    expect(getStoredTheme()).toBeNull();
  });

  it('treats a corrupt cached value as absent', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'aubergine');
    expect(getStoredTheme()).toBeNull();
  });

  it('returns null rather than throwing when storage is unreadable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    expect(getStoredTheme()).toBeNull();
  });
});

describe('setStoredTheme', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes the preference as a raw string the pre-paint script can read', () => {
    setStoredTheme('dark');
    // Not JSON — index.html reads this with no parse step.
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('stores system as system, never as the theme it resolved to', () => {
    // The Auto-decays-into-Dark failure: persist the preference, never the result.
    stubMatchMedia(true);
    setStoredTheme('system');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('system');
  });

  it('does not throw when storage is unwritable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    expect(() => setStoredTheme('dark')).not.toThrow();
  });
});

describe('resolveSystemTheme', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(window, 'matchMedia');
  });

  it('reports dark under a dark OS scheme', () => {
    stubMatchMedia(true);
    expect(resolveSystemTheme()).toBe('dark');
  });

  it('reports light under a light OS scheme', () => {
    stubMatchMedia(false);
    expect(resolveSystemTheme()).toBe('light');
  });

  it('falls back to light where matchMedia is unavailable', () => {
    expect(resolveSystemTheme()).toBe('light');
  });
});

describe('subscribeToSystemTheme', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(window, 'matchMedia');
  });

  it('reports a scheme change to the listener', () => {
    const media = stubMatchMedia(false);
    const seen: ResolvedTheme[] = [];

    subscribeToSystemTheme((theme) => seen.push(theme));
    media.emit(true);

    expect(seen).toEqual(['dark']);
  });

  it('stops reporting once unsubscribed', () => {
    const media = stubMatchMedia(false);
    const seen: ResolvedTheme[] = [];

    const unsubscribe = subscribeToSystemTheme((theme) => seen.push(theme));
    unsubscribe();
    media.emit(true);

    expect(seen).toEqual([]);
    expect(media.listenerCount()).toBe(0);
  });

  it('returns a usable unsubscribe where matchMedia is unavailable', () => {
    const unsubscribe = subscribeToSystemTheme(() => {});
    expect(() => unsubscribe()).not.toThrow();
  });
});

describe('applyTheme', () => {
  afterEach(() => {
    document.documentElement.classList.remove('dark');
  });

  it('adds the dark class for a dark theme', () => {
    applyTheme('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('removes the dark class for a light theme', () => {
    document.documentElement.classList.add('dark');
    applyTheme('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
