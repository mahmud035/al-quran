// Types mirroring the backend response envelope and user-data shapes.
// Keep these in sync with server/src/modules/* so API changes break at compile time.

export interface ApiEnvelope<T> {
  statusCode: number;
  success: boolean;
  message: string;
  data: T;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface Bookmark {
  _id: string;
  user: string;
  surahNumber: number;
  /** 0 = surah-level favourite; >=1 = a specific ayah. */
  ayahNumber: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

/** Where the user resumes reading. Mirrors server ILastRead. */
export interface LastReadPosition {
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  updatedAt: string;
}

/** Mirrors server ProgressResponse. */
export interface UserProgress {
  /** Base64 of the 780-byte coverage bitmap. */
  coverage: string;
  khatmahPercent: number;
  streak: {
    /** Display streak: already zeroed server-side when the streak has lapsed. */
    current: number;
    longest: number;
    /** Date-only 'YYYY-MM-DD', or null when the user has never read. */
    lastActiveDay: string | null;
  };
  lastRead: LastReadPosition | null;
}

export type Reciter =
  | 'ar.alafasy'
  | 'ar.abdullahbasfar'
  | 'ar.saoodshuraym'
  | 'ar.abdurrahmaansudais'
  | 'ar.hanirifai'
  | 'ar.mahermuaiqly';
export type TranslationEdition = 'en.pickthall' | 'bn.bengali';
export type FontSize = 'sm' | 'md' | 'lg' | 'xl';
export type Theme = 'light' | 'dark';

export interface UserSettings {
  _id: string;
  user: string;
  reciter: Reciter;
  translationEdition: TranslationEdition;
  fontSize: FontSize;
  theme: Theme;
  createdAt: string;
  updatedAt: string;
}
