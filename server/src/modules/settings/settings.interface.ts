import { Document, Model, Types } from 'mongoose';

export type Reciter =
  | 'ar.alafasy'
  | 'ar.abdullahbasfar'
  | 'ar.saoodshuraym'
  | 'ar.abdurrahmaansudais'
  | 'ar.hanirifai'
  | 'ar.mahermuaiqly';
export type TranslationEdition = 'en.pickthall' | 'bn.bengali';
export type FontSize = 'sm' | 'md' | 'lg' | 'xl';
export type Theme = 'system' | 'light' | 'dark';

export interface IUserSettings {
  user: Types.ObjectId;
  reciter: Reciter;
  translationEdition: TranslationEdition;
  fontSize: FontSize;
  theme: Theme;
}

export interface IUserSettingsDocument extends IUserSettings, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type IUserSettingsModel = Model<IUserSettingsDocument>;

export const RECITERS: Reciter[] = [
  'ar.alafasy',
  'ar.abdullahbasfar',
  'ar.saoodshuraym',
  'ar.abdurrahmaansudais',
  'ar.hanirifai',
  'ar.mahermuaiqly',
];
export const TRANSLATION_EDITIONS: TranslationEdition[] = ['en.pickthall', 'bn.bengali'];
export const FONT_SIZES: FontSize[] = ['sm', 'md', 'lg', 'xl'];
export const THEMES: Theme[] = ['system', 'light', 'dark'];
