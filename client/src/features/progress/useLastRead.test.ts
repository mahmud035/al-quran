import { resolveLastRead } from '@/features/progress/useLastRead';
import type { LastReadPosition } from '@/types/api';
import type { LastRead } from '@/utils/lastRead';
import { describe, expect, it } from 'vitest';

const local = (updatedAt?: number): LastRead => ({
  surahNumber: 2,
  surahName: 'Al-Baqara',
  ayahNumber: 100,
  ...(updatedAt === undefined ? {} : { updatedAt }),
});

const server = (updatedAt: string): LastReadPosition => ({
  surahNumber: 18,
  surahName: 'Al-Kahf',
  ayahNumber: 10,
  updatedAt,
});

const NOON = '2026-07-20T12:00:00.000Z';
const NOON_MS = Date.parse(NOON);

describe('resolveLastRead', () => {
  it('pushes local when there is no server position', () => {
    expect(resolveLastRead(local(NOON_MS), null)).toBe('push-local');
  });

  it('pushes an untimestamped local record when there is no server position', () => {
    // Written before timestamps existed. Discarding it would lose the position.
    expect(resolveLastRead(local(undefined), null)).toBe('push-local');
  });

  it('adopts the server position when there is no local record', () => {
    expect(resolveLastRead(null, server(NOON))).toBe('adopt-server');
  });

  it('pushes local when it is newer', () => {
    expect(resolveLastRead(local(NOON_MS + 60_000), server(NOON))).toBe('push-local');
  });

  it('adopts the server position when it is newer', () => {
    expect(resolveLastRead(local(NOON_MS - 60_000), server(NOON))).toBe('adopt-server');
  });

  it('adopts the server position when the local record has no timestamp', () => {
    expect(resolveLastRead(local(undefined), server(NOON))).toBe('adopt-server');
  });

  it('adopts the server position when the two are exactly equal', () => {
    expect(resolveLastRead(local(NOON_MS), server(NOON))).toBe('adopt-server');
  });

  it('does nothing when neither position exists', () => {
    expect(resolveLastRead(null, null)).toBe('none');
  });

  it('keeps the local position when the server timestamp is unparseable', () => {
    expect(resolveLastRead(local(NOON_MS), server('not a date'))).toBe('push-local');
  });
});
