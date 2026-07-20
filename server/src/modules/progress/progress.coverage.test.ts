import { describe, expect, it } from 'vitest';
import {
  COVERAGE_BYTES,
  TOTAL_AYAHS,
  countRead,
  coverageToRanges,
  createEmptyCoverage,
  hasAyah,
  khatmahPercent,
  setAyahs,
} from './progress.coverage';

/** Inclusive range of global ayah numbers, as a flat array. */
const range = (start: number, end: number): number[] =>
  Array.from({ length: end - start + 1 }, (_, i) => start + i);

describe('coverage bitmap', () => {
  it('starts empty at the fixed size', () => {
    const coverage = createEmptyCoverage();
    expect(coverage.length).toBe(COVERAGE_BYTES);
    expect(countRead(coverage)).toBe(0);
    expect(coverageToRanges(coverage)).toEqual([]);
  });

  it('records non-contiguous reading without crediting the gap', () => {
    // Two disjoint blocks, standing in for reading one surah and later a distant one.
    const coverage = setAyahs(createEmptyCoverage(), [...range(8, 293), ...range(2140, 2250)]);

    expect(coverageToRanges(coverage)).toEqual([
      [8, 293],
      [2140, 2250],
    ]);
    expect(hasAyah(coverage, 8)).toBe(true);
    expect(hasAyah(coverage, 293)).toBe(true);
    expect(hasAyah(coverage, 294)).toBe(false);
    expect(hasAyah(coverage, 1000)).toBe(false);
    expect(countRead(coverage)).toBe(286 + 111);
  });

  it('is idempotent when the same ayahs are recorded again', () => {
    const once = setAyahs(createEmptyCoverage(), range(1, 50));
    const twice = setAyahs(once, range(1, 50));

    expect(twice.equals(once)).toBe(true);
    expect(countRead(twice)).toBe(50);
    expect(khatmahPercent(twice)).toBe(khatmahPercent(once));
  });

  it('is idempotent when a batch overlaps existing coverage', () => {
    const base = setAyahs(createEmptyCoverage(), range(1, 50));
    const overlapping = setAyahs(base, range(40, 60));

    expect(coverageToRanges(overlapping)).toEqual([[1, 60]]);
    expect(countRead(overlapping)).toBe(60);
  });

  it('does not mutate the buffer it was given', () => {
    const base = createEmptyCoverage();
    setAyahs(base, [1, 2, 3]);
    expect(countRead(base)).toBe(0);
  });

  it('stores the same size regardless of reading pattern', () => {
    const sequential = setAyahs(createEmptyCoverage(), range(1, 500));
    const scattered = setAyahs(
      createEmptyCoverage(),
      range(1, 500).map((n) => n * 12), // 500 ayahs, spread across the whole Qur'an
    );

    expect(sequential.length).toBe(scattered.length);
    expect(sequential.length).toBe(COVERAGE_BYTES);
    expect(countRead(sequential)).toBe(countRead(scattered));
  });

  it('reports 50 percent for half the Qur’an', () => {
    const coverage = setAyahs(createEmptyCoverage(), range(1, 3118));
    expect(countRead(coverage)).toBe(3118);
    expect(khatmahPercent(coverage)).toBe(50);
  });

  it('reports 0 percent for empty coverage', () => {
    expect(khatmahPercent(createEmptyCoverage())).toBe(0);
  });

  it('reports 100 percent for a completed khatmah', () => {
    const coverage = setAyahs(createEmptyCoverage(), range(1, TOTAL_AYAHS));
    expect(countRead(coverage)).toBe(TOTAL_AYAHS);
    expect(khatmahPercent(coverage)).toBe(100);
  });

  it('ignores ayah numbers outside the valid range', () => {
    const coverage = setAyahs(createEmptyCoverage(), [0, -1, TOTAL_AYAHS + 1, 1.5, TOTAL_AYAHS]);
    expect(coverageToRanges(coverage)).toEqual([[TOTAL_AYAHS, TOTAL_AYAHS]]);
  });

  it('does not count bits past the last ayah in a corrupt buffer', () => {
    const coverage = createEmptyCoverage();
    coverage[COVERAGE_BYTES - 1] = 0xff; // sets the 4 spare bits as well as ayahs 6233..6236
    expect(countRead(coverage)).toBe(4);
  });

  it('accepts a BSON Binary as stored coverage', () => {
    // A .lean() read returns BSON Binary, not a Buffer: same bytes, different object,
    // and the query types cannot distinguish them. Every reader must handle it.
    const stored = setAyahs(createEmptyCoverage(), range(1, 7));
    const asBinary = { buffer: new Uint8Array(stored) };

    expect(countRead(asBinary)).toBe(7);
    expect(coverageToRanges(asBinary)).toEqual([[1, 7]]);
    expect(coverageToRanges(setAyahs(asBinary, [100]))).toEqual([
      [1, 7],
      [100, 100],
    ]);
  });

  it('coerces a short or oversized stored buffer to the fixed size', () => {
    const short = setAyahs(Buffer.alloc(10), [5]);
    expect(short.length).toBe(COVERAGE_BYTES);
    expect(coverageToRanges(short)).toEqual([[5, 5]]);

    const long = setAyahs(Buffer.alloc(COVERAGE_BYTES + 50), [5]);
    expect(long.length).toBe(COVERAGE_BYTES);
  });
});
