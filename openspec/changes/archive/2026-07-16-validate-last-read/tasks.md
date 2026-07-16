# Tasks

## 1. Add validation to lastRead

- [x] 1.1 Add an `isLastRead(value: unknown): value is LastRead` type-guard in `client/src/utils/lastRead.ts` that checks the value is a non-null object with `surahNumber: number`, `surahName: string`, and `ayahNumber: number`.
- [x] 1.2 Update `getLastRead()` to parse into `unknown`, run the guard, and return the value only if valid — otherwise `null` (keep the existing `try/catch` for unparseable JSON).

## 2. Verify

- [x] 2.1 Type-check: `tsc -b` in `client/` is clean.
- [x] 2.2 Confirm the spec scenarios by reasoning through each stored value: valid record → returned; missing/wrong-type field → null; bare string → null; unparseable → null; no entry → null.
