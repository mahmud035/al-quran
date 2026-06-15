import { AppError } from '../../utils/AppError';
import { IBookmarkDocument } from './bookmarks.interface';
import { Bookmark } from './bookmarks.model';
import { CreateBookmarkInput } from './bookmarks.validation';

/** List all of a user's bookmarks, newest surah/ayah first. */
const list = async (userId: string): Promise<IBookmarkDocument[]> => {
  return Bookmark.find({ user: userId }).sort({ surahNumber: 1, ayahNumber: 1 });
};

/**
 * Create a bookmark. The (user, surah, ayah) unique index makes this idempotent:
 * a duplicate is rejected with 409 rather than creating a second row.
 */
const create = async (
  userId: string,
  input: CreateBookmarkInput,
): Promise<IBookmarkDocument> => {
  const existing = await Bookmark.findOne({
    user: userId,
    surahNumber: input.surahNumber,
    ayahNumber: input.ayahNumber,
  });
  if (existing) {
    throw new AppError(409, 'This ayah is already bookmarked');
  }

  return Bookmark.create({ ...input, user: userId });
};

/** Delete a bookmark by id, scoped to the owning user. */
const remove = async (userId: string, id: string): Promise<void> => {
  const deleted = await Bookmark.findOneAndDelete({ _id: id, user: userId });
  if (!deleted) {
    throw new AppError(404, 'Bookmark not found');
  }
};

/** Toggle-state helper for the reader: is this (surah, ayah) bookmarked? */
const check = async (
  userId: string,
  surahNumber: number,
  ayahNumber: number,
): Promise<{ bookmarked: boolean; id: string | null }> => {
  const found = await Bookmark.findOne({ user: userId, surahNumber, ayahNumber });
  return { bookmarked: Boolean(found), id: found ? found._id.toString() : null };
};

export const bookmarksService = {
  list,
  create,
  remove,
  check,
};
