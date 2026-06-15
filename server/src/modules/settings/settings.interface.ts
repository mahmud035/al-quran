import { Document, Model, Types } from 'mongoose';

export type Reciter = 'ar.alafasy' | 'ar.abdulsamad' | 'ar.abdullahbasfar';
export type TranslationEdition = 'en.pickthall' | 'bn.bengali';
export type FontSize = 'sm' | 'md' | 'lg' | 'xl';
export type Theme = 'light' | 'dark';

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

export const RECITERS: Reciter[] = ['ar.alafasy', 'ar.abdulsamad', 'ar.abdullahbasfar'];
export const TRANSLATION_EDITIONS: TranslationEdition[] = ['en.pickthall', 'bn.bengali'];
export const FONT_SIZES: FontSize[] = ['sm', 'md', 'lg', 'xl'];
export const THEMES: Theme[] = ['light', 'dark'];
