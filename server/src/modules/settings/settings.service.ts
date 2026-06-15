import { IUserSettingsDocument } from './settings.interface';
import { UserSettings } from './settings.model';
import { UpdateSettingsInput } from './settings.validation';

/**
 * Get the user's settings, creating a defaults row on first read so the client
 * always receives a complete settings object.
 */
const get = async (userId: string): Promise<IUserSettingsDocument> => {
  const existing = await UserSettings.findOne({ user: userId });
  if (existing) return existing;
  return UserSettings.create({ user: userId });
};

/** Upsert the user's settings, merging the provided partial update. */
const update = async (
  userId: string,
  input: UpdateSettingsInput,
): Promise<IUserSettingsDocument> => {
  return UserSettings.findOneAndUpdate(
    { user: userId },
    { $set: input },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
  );
};

export const settingsService = {
  get,
  update,
};
