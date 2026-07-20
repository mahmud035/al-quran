import type { ReaderAyah } from '@/features/surahs/useSurah';

/**
 * The text handed to the clipboard and the share sheet:
 *
 *   {arabic}
 *
 *   {translation}
 *
 *   — Surah {englishName} {surah}:{ayah}
 *
 * Transliteration is deliberately left out — it is a reading aid, not part of the
 * quotation.
 */
export function formatAyahShareText(
  ayah: ReaderAyah,
  surahNumber: number,
  surahEnglishName: string,
): string {
  return [
    ayah.arabic,
    ayah.translation,
    `— Surah ${surahEnglishName} ${surahNumber}:${ayah.numberInSurah}`,
  ].join('\n\n');
}
