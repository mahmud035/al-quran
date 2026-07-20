/**
 * Coverage bitmap primitives (design D2).
 *
 * Coverage is a fixed 780-byte buffer holding one bit per global ayah number:
 * bit `n - 1` for ayah `n`, LSB-first within each byte. The size never depends on
 * how sequentially or erratically the user reads, and every operation is a bitwise
 * primitive rather than logic that can drift.
 *
 * These functions are pure: no database, no clock. Everything here is unit-tested
 * directly.
 */

/** Total ayahs in the Qur'an; the width of the coverage bitmap in bits. */
export const TOTAL_AYAHS = 6236;

/** Bytes needed to hold TOTAL_AYAHS bits. */
export const COVERAGE_BYTES = Math.ceil(TOTAL_AYAHS / 8); // 780

// The final byte carries 4 bits past ayah 6236. They are never set by setAyahs, but a
// corrupt or foreign buffer could carry them, so counting masks them off.
const TRAILING_BIT_MASK = 0xff >> (COVERAGE_BYTES * 8 - TOTAL_AYAHS);

// Popcount per byte value, built once.
const POPCOUNT = new Uint8Array(256);
for (let i = 0; i < 256; i += 1) {
  POPCOUNT[i] = (i & 1) + POPCOUNT[i >> 1];
}

/** A zeroed coverage bitmap — the representation of a user who has read nothing. */
export const createEmptyCoverage = (): Buffer => Buffer.alloc(COVERAGE_BYTES);

/**
 * Coverage as it can arrive from storage. A hydrated Mongoose document gives a Buffer,
 * but a `.lean()` read gives the raw BSON `Binary`, which is a different object with
 * the bytes under `.buffer`. Both must be accepted — the type system cannot tell them
 * apart at the query boundary.
 */
export type StoredCoverage = Buffer | Uint8Array | { buffer: Uint8Array } | null | undefined;

/** Narrow any of the stored shapes to the raw bytes. */
const toBytes = (value: StoredCoverage): Uint8Array | null => {
  if (!value) return null;
  if (value instanceof Uint8Array) return value; // covers Buffer
  if (value.buffer instanceof Uint8Array) return value.buffer; // BSON Binary
  return null;
};

/**
 * Coerce stored coverage to a Buffer of exactly COVERAGE_BYTES, so a short, long,
 * absent, or BSON-wrapped value can never make the bitwise operations read out of
 * bounds or fail on a missing method.
 */
export const normalizeCoverage = (value: StoredCoverage): Buffer => {
  const target = createEmptyCoverage();
  const bytes = toBytes(value);
  if (bytes) target.set(bytes.subarray(0, COVERAGE_BYTES));
  return target;
};

/**
 * Set the bits for the given global ayah numbers, returning new coverage.
 *
 * This is a bitwise OR, so it is inherently idempotent: re-setting a bit that is
 * already set is a no-op. Retries and duplicate batches therefore need no
 * deduplication anywhere. Numbers outside 1..TOTAL_AYAHS are ignored — validation
 * rejects them at the edge, and silently skipping here keeps the primitive total.
 */
export const setAyahs = (stored: StoredCoverage, ayahNumbers: number[]): Buffer => {
  const next = normalizeCoverage(stored);

  for (const ayah of ayahNumbers) {
    if (!Number.isInteger(ayah) || ayah < 1 || ayah > TOTAL_AYAHS) continue;
    const bit = ayah - 1;
    next[bit >> 3] |= 1 << (bit & 7);
  }

  return next;
};

/** Whether the given global ayah number is present in coverage. */
export const hasAyah = (buffer: Buffer, ayah: number): boolean => {
  if (!Number.isInteger(ayah) || ayah < 1 || ayah > TOTAL_AYAHS) return false;
  const bit = ayah - 1;
  return (buffer[bit >> 3] & (1 << (bit & 7))) !== 0;
};

/** How many distinct ayahs are present in coverage. */
export const countRead = (stored: StoredCoverage): number => {
  const coverage = normalizeCoverage(stored);
  let total = 0;

  for (let i = 0; i < COVERAGE_BYTES - 1; i += 1) {
    total += POPCOUNT[coverage[i]];
  }
  total += POPCOUNT[coverage[COVERAGE_BYTES - 1] & TRAILING_BIT_MASK];

  return total;
};

/**
 * Khatmah progress as a percentage of all TOTAL_AYAHS ayahs, rounded to two
 * decimals. Always derived from coverage, never accumulated independently.
 */
export const khatmahPercent = (stored: StoredCoverage): number => {
  const read = countRead(stored);
  return Math.round((read / TOTAL_AYAHS) * 10000) / 100;
};

/**
 * Collapse coverage into inclusive `[start, end]` ranges of global ayah numbers.
 *
 * The bitmap's one real cost is that it is opaque in a database GUI (design D2).
 * This is the offset: it makes coverage inspectable in tests and when debugging.
 */
export const coverageToRanges = (stored: StoredCoverage): Array<[number, number]> => {
  const coverage = normalizeCoverage(stored);
  const ranges: Array<[number, number]> = [];
  let start: number | null = null;

  for (let ayah = 1; ayah <= TOTAL_AYAHS; ayah += 1) {
    if (hasAyah(coverage, ayah)) {
      if (start === null) start = ayah;
    } else if (start !== null) {
      ranges.push([start, ayah - 1]);
      start = null;
    }
  }

  if (start !== null) ranges.push([start, TOTAL_AYAHS]);

  return ranges;
};
