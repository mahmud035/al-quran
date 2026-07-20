import { formatAyahShareText } from '@/features/surahs/formatAyahShareText';
import type { ReaderAyah } from '@/features/surahs/useSurah';
import { describe, expect, it } from 'vitest';

const ayah: ReaderAyah = {
  numberInSurah: 5,
  globalNumber: 5,
  arabic: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
  transliteration: 'Iyyaka naAAbudu wa-iyyaka nastaAAeen',
  translation: 'Thee (alone) we worship; Thee (alone) we ask for help.',
};

describe('formatAyahShareText', () => {
  it('joins Arabic, translation, and reference with blank lines', () => {
    expect(formatAyahShareText(ayah, 1, 'Al-Faatiha')).toBe(
      'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ\n\n' +
        'Thee (alone) we worship; Thee (alone) we ask for help.\n\n' +
        '— Surah Al-Faatiha 1:5',
    );
  });

  it('omits the transliteration', () => {
    expect(formatAyahShareText(ayah, 1, 'Al-Faatiha')).not.toContain(ayah.transliteration);
  });
});
