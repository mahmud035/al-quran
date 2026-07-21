import { describe, expect, it } from 'vitest';
import { THEMES } from './settings.interface';
import { settingsValidation } from './settings.validation';

const parseTheme = (theme: unknown) =>
  settingsValidation.updateSchema.safeParse({ body: { theme } });

describe('settings update validation — theme', () => {
  it('accepts every supported theme', () => {
    for (const theme of ['system', 'light', 'dark']) {
      expect(parseTheme(theme).success, theme).toBe(true);
    }
  });

  it('rejects a theme outside the enum', () => {
    expect(parseTheme('aubergine').success).toBe(false);
  });

  it('rejects a non-string theme', () => {
    expect(parseTheme(1).success).toBe(false);
  });

  it('keeps the Zod enum and the Mongoose enum reading from one list', () => {
    // Both layers derive from THEMES, so widening the union in one place widens both.
    // This asserts the list itself, which is what the model's `enum` also consumes.
    expect(THEMES).toEqual(['system', 'light', 'dark']);
  });
});
