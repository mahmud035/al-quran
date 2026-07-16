## Context

`getLastRead()` in `client/src/utils/lastRead.ts` reads the `qm:last-read` key, runs `JSON.parse`, and returns the result cast as `LastRead`. Its `try/catch` only defends against `JSON.parse` throwing on malformed JSON. When the stored value parses but has the wrong shape (partial object, old schema, a bare string/number), the cast passes it through unchanged. `HomePage` guards only with `lastRead && ...` — a partial object is still truthy — so it renders "Continue reading undefined — ayah undefined" linking to the dead route `/surah/undefined#ayah-undefined`.

## Goals / Non-Goals

**Goals:**
- `getLastRead()` returns a `LastRead` only when the stored value is genuinely well-formed; otherwise `null`.
- No changes required in consumers — a trustworthy `null` is enough for `HomePage` to hide the chip.

**Non-Goals:**
- Adding a validation library (Zod, etc.) — overkill for three primitive fields.
- Validating on the write path — `setLastRead` is only ever called internally with a typed `LastRead`.
- Actively clearing corrupt storage — out of scope; ignoring it self-heals on the next real write.
- Migrating or salvaging old-schema data — a bad value is simply treated as "no saved position."

## Decisions

### Decision 1: Inline type-guard, no dependency

Add a small `isLastRead(value: unknown): value is LastRead` predicate that checks the value is a non-null object with `surahNumber: number`, `surahName: string`, and `ayahNumber: number`. `getLastRead()` parses into `unknown`, runs the guard, and returns the value or `null`. Three primitive checks don't justify a schema library, and a typed predicate keeps the `as`-cast honest.

### Decision 2: Return null on any invalidity, inside the existing try/catch

All failure modes collapse to one behavior — `return null` — covering unparseable JSON (caught) and wrong-shaped-but-parseable data (guard). Consumers already handle `null`, so no downstream edits.

## Risks / Trade-offs

- **Silent discard of a "real" position that fails the guard.** Only possible if the schema changes in future; the cost is one lost scroll position, recreated on the next read. Acceptable, and the alternative (a broken link) is worse.
- **Guard drift if `LastRead` gains fields.** Mitigation: the predicate lives next to the interface in the same file, so they change together.
