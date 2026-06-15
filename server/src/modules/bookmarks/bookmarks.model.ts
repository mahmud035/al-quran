import { Schema, model } from 'mongoose';
import { IBookmarkDocument, IBookmarkModel } from './bookmarks.interface';

const bookmarkSchema = new Schema<IBookmarkDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    surahNumber: { type: Number, required: true, min: 1, max: 114 },
    ayahNumber: { type: Number, required: true, min: 0 },
    note: { type: String, trim: true },
  },
  { timestamps: true },
);

// One bookmark per (user, surah, ayah) — backs both idempotent create and the check endpoint.
bookmarkSchema.index({ user: 1, surahNumber: 1, ayahNumber: 1 }, { unique: true });

export const Bookmark = model<IBookmarkDocument, IBookmarkModel>('Bookmark', bookmarkSchema);
