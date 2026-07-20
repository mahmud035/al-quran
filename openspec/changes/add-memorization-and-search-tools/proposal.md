## Why

The reader, player, settings sync and bookmarks all work, but nothing in the app
supports the two things people actually open a Quran app to do: **memorize a passage**
and **find a verse they half-remember**. Playback is strictly linear (one pass through
a surah, then stop), and "search" only filters the 114 surah names — a limitation the
README already documents. Both gaps are closable client-side against endpoints
AlQuran.cloud already exposes, with no schema change and no new backend module.

## What Changes

- **Repeat modes in the player** — repeat the current ayah N times, repeat a selected
  ayah range `[a..b]`, or loop the whole surah. Adds a `repeat` slice to
  `playerReducer` and changes what the `ended` handler does at the end of a track.
- **Playback speed control** — user-selectable recitation speed applied via
  `audio.playbackRate`, surfaced in `PlayerBar`.
- **Verse search across translations** — `SearchPage` gains full-text search over the
  active translation edition via `GET /search/{query}/all/{edition}`. Surah-name
  matching is **kept**, rendered as a section above the verse hits in the same input,
  so today's "Baqara" / "2" behaviour does not regress.
- **Copy and share an ayah** — per-ayah action in `AyahCard` that copies formatted
  Arabic + translation + reference to the clipboard, and offers the Web Share API
  where the browser supports it.

Repeat state and playback speed are **session-only** — they live in `PlayerContext`
and reset on reload. No `settings` document field, no server change. This keeps the
batch entirely client-side.

No breaking changes.

## Capabilities

### New Capabilities

- `recitation-repeat`: repeat behaviour for per-ayah audio playback — repeat-ayah with
  a count, repeat over an ayah range, loop-surah, and how each interacts with manual
  next/prev, reciter switching, and reaching the end of a surah.
- `playback-speed`: selectable recitation speed, its allowed values, how it is applied
  to the audio element, and its lifetime (session-scoped, resets on reload).
- `verse-search`: full-text search over the active translation edition — query
  handling, debounce, result shape, deep-linking a result to its ayah, and the
  required loading / empty / error states. Includes the retained surah-name matching
  and how the two result groups are ordered in one combined view.
- `ayah-share`: copying and sharing a single ayah — the formatted text contract,
  clipboard behaviour, Web Share API fallback, and user feedback on success/failure.

### Modified Capabilities

None. `last-read-persistence` is untouched by this change.

## Impact

**Client only.** No server, database, or API-contract changes.

- `client/src/context/playerReducer.ts` — new `repeat` and `playbackRate` state plus
  the actions that set them; `NEXT` / end-of-playlist resolution becomes
  repeat-mode-aware.
- `client/src/features/player/usePlayer.ts` — `ended` handling, `playbackRate`
  application to the audio element.
- `client/src/features/player/PlayerBar.tsx` — repeat and speed controls.
- `client/src/pages/SearchPage.tsx` — combined surah + verse results.
- `client/src/features/search/` — new query hook for the AlQuran.cloud search endpoint
  (mirrors the existing `useSurah` fetch-and-shape pattern).
- `client/src/features/surahs/AyahCard.tsx` — copy/share action.
- `client/src/utils/constants.ts` — speed options; search endpoint path if not derived.

**External dependency:** `GET https://api.alquran.cloud/v1/search/{query}/all/{edition}`
— verified reachable and returning `{ count, matches[] }`. Search covers the selected
translation edition only, not the Arabic text.

**Verification gate for the batch:** `npm run build` clean and `npx tsc --noEmit` clean
in `client/`, plus manual scenarios — each repeat mode loops correctly and stops when
cancelled, speed persists across ayah transitions within a session and resets on
reload, a known phrase returns its verse and the result deep-links to the right ayah,
and copy/share produces the agreed text on a browser with and without `navigator.share`.
