import { z } from 'zod';

const createSchema = z.object({
  body: z.object({
    surahNumber: z.coerce.number().int().min(1).max(114),
    ayahNumber: z.coerce.number().int().min(0),
    note: z.string().trim().max(500).optional(),
  }),
});

const checkSchema = z.object({
  query: z.object({
    surah: z.coerce.number().int().min(1).max(114),
    ayah: z.coerce.number().int().min(0),
  }),
});

const idParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid bookmark id'),
  }),
});

export const bookmarksValidation = {
  createSchema,
  checkSchema,
  idParamSchema,
};

export type CreateBookmarkInput = z.infer<typeof createSchema>['body'];
