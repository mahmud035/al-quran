import { z } from 'zod';
import { FONT_SIZES, RECITERS, THEMES, TRANSLATION_EDITIONS } from './settings.interface';

// PUT accepts a partial update; at least one field must be present.
const updateSchema = z.object({
  body: z
    .object({
      reciter: z.enum(RECITERS as [string, ...string[]]).optional(),
      translationEdition: z.enum(TRANSLATION_EDITIONS as [string, ...string[]]).optional(),
      fontSize: z.enum(FONT_SIZES as [string, ...string[]]).optional(),
      theme: z.enum(THEMES as [string, ...string[]]).optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: 'Provide at least one setting to update',
    }),
});

export const settingsValidation = {
  updateSchema,
};

export type UpdateSettingsInput = z.infer<typeof updateSchema>['body'];
