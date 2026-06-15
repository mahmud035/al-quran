import type { FontSize, Reciter, TranslationEdition } from '@/types/api';

/** AlQuran.cloud API root. Only specific endpoints are valid; never probe /v1 itself. */
export const ALQURAN_BASE = 'https://api.alquran.cloud/v1';

/** Per-ayah audio CDN. Path: {AUDIO_CDN}/{bitrate}/{reciter}/{globalAyahNumber}.mp3 */
export const AUDIO_CDN = 'https://cdn.islamic.network/quran/audio';

/**
 * Available bitrate per reciter on the CDN. Verified at build time: only Alafasy
 * is published at 128kbps; Abdul Basit and Abdullah Basfar exist only at 64kbps
 * (128 returns 403). Using the wrong bitrate breaks playback for those reciters.
 */
export const RECITER_BITRATE: Record<Reciter, 128 | 64> = {
  'ar.alafasy': 128,
  'ar.mahermuaiqly': 128,
  'ar.abdullahbasfar': 64,
  'ar.saoodshuraym': 64,
  'ar.abdurrahmaansudais': 64,
  'ar.hanirifai': 64,
};

// Default editions for the multi-edition reader fetch.
export const EDITION_ARABIC = 'quran-uthmani';
export const EDITION_TRANSLITERATION = 'en.transliteration';

export const RECITERS: { value: Reciter; label: string }[] = [
  { value: 'ar.alafasy', label: 'Mishary Alafasy' },
  { value: 'ar.abdullahbasfar', label: 'Abdullah Basfar' },
  { value: 'ar.saoodshuraym', label: 'Saud Al-Shuraim' },
  { value: 'ar.abdurrahmaansudais', label: 'Abdurrahman Al-Sudais' },
  { value: 'ar.hanirifai', label: 'Hani Ar-Rifai' },
  { value: 'ar.mahermuaiqly', label: 'Maher Al-Muaiqly' },
];

export const TRANSLATIONS: { value: TranslationEdition; label: string }[] = [
  { value: 'en.pickthall', label: 'English — Pickthall' },
  { value: 'bn.bengali', label: 'Bengali — Muhiuddin Khan' },
];

export const FONT_SIZES: { value: FontSize; label: string }[] = [
  { value: 'sm', label: 'A' },
  { value: 'md', label: 'A' },
  { value: 'lg', label: 'A' },
  { value: 'xl', label: 'A' },
];

/** Arabic text size per font-size setting (applied on AyahCard). */
export const ARABIC_TEXT_SIZE: Record<FontSize, string> = {
  sm: 'text-2xl leading-loose',
  md: 'text-3xl leading-loose',
  lg: 'text-4xl leading-[2.4]',
  xl: 'text-5xl leading-[2.5]',
};

export const DEFAULT_RECITER: Reciter = 'ar.alafasy';
export const DEFAULT_TRANSLATION: TranslationEdition = 'en.pickthall';
export const DEFAULT_FONT_SIZE: FontSize = 'md';
