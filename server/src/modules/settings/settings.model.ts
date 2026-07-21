import { Schema, model } from 'mongoose';
import {
  FONT_SIZES,
  IUserSettingsDocument,
  IUserSettingsModel,
  RECITERS,
  THEMES,
  TRANSLATION_EDITIONS,
} from './settings.interface';

const settingsSchema = new Schema<IUserSettingsDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    reciter: { type: String, enum: RECITERS, default: 'ar.alafasy' },
    translationEdition: { type: String, enum: TRANSLATION_EDITIONS, default: 'en.pickthall' },
    fontSize: { type: String, enum: FONT_SIZES, default: 'md' },
    theme: { type: String, enum: THEMES, default: 'system' },
  },
  { timestamps: true },
);

export const UserSettings = model<IUserSettingsDocument, IUserSettingsModel>(
  'UserSettings',
  settingsSchema,
);
