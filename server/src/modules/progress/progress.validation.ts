import { z } from 'zod';
import { TOTAL_AYAHS } from './progress.coverage';

/**
 * Cap on ayahs per request, so a malformed or hostile client cannot send an unbounded
 * payload (design D9). Comfortably above the longest surah (286 ayahs) and above what
 * a recovered local-storage mirror can hold.
 */
export const MAX_AYAHS_PER_REQUEST = 1000;

// An invalid zone is not rejected here — the service falls back to UTC rather than
// losing the reading record (design D5). This only bounds the string.
const timezoneSchema = z.string().trim().max(64).optional();

const recordAyahsSchema = z.object({
  body: z.object({
    ayahs: z
      .array(z.number().int().min(1).max(TOTAL_AYAHS))
      .min(1, 'Provide at least one ayah')
      .max(MAX_AYAHS_PER_REQUEST, `At most ${MAX_AYAHS_PER_REQUEST} ayahs per request`),
    timezone: timezoneSchema,
  }),
});

const getProgressSchema = z.object({
  query: z.object({
    timezone: timezoneSchema,
  }),
});

const lastReadSchema = z.object({
  body: z.object({
    surahNumber: z.coerce.number().int().min(1).max(114),
    surahName: z.string().trim().min(1).max(100),
    ayahNumber: z.coerce.number().int().min(1),
  }),
});

export const progressValidation = {
  recordAyahsSchema,
  getProgressSchema,
  lastReadSchema,
};

export type RecordAyahsInput = z.infer<typeof recordAyahsSchema>['body'];
export type LastReadInput = z.infer<typeof lastReadSchema>['body'];
