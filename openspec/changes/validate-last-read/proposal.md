## Why

The "Continue Reading" chip on the home page trusts whatever `JSON.parse` returns from `localStorage`, casting it to `LastRead` without a runtime check. Corrupt, partial, or old-schema data (hand-edited storage, a truncated write, a stale key from a prior version) parses successfully but yields a malformed object — producing a "Continue reading **undefined** — ayah **undefined**" chip that links to the dead route `/surah/undefined#ayah-undefined`.

## What Changes

- `getLastRead()` validates the parsed value's shape before returning it: it must be an object with `surahNumber: number`, `surahName: string`, and `ayahNumber: number`.
- Any value failing validation is treated the same as "no saved position" — `getLastRead()` returns `null` and the chip stays hidden (self-heals on the next real read).
- The existing `try/catch` (which only guards against `JSON.parse` throwing) is retained; validation covers the "parses but wrong shape" gap it misses.
- Read-side only — `setLastRead` is unchanged (it is only ever called internally with a typed object).

## Capabilities

### New Capabilities
- `last-read-persistence`: Persisting and safely retrieving the user's last-read Quran position from local storage, including validation of untrusted stored data.

### Modified Capabilities
<!-- none — no existing specs in openspec/specs/ -->

## Impact

- `client/src/utils/lastRead.ts`: add a runtime shape guard in `getLastRead()` (~10 lines).
- No changes to `client/src/pages/HomePage.tsx` or `client/src/features/surahs/SurahReader.tsx` — they benefit automatically from a trustworthy `null`.
- No new dependencies. No API or schema changes.
