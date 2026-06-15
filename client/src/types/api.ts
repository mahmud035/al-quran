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
