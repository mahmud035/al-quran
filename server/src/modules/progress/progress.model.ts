import { Schema, model } from 'mongoose';
import { createEmptyCoverage } from './progress.coverage';
import { IUserProgressDocument, IUserProgressModel } from './progress.interface';

// Embedded, not a separate collection: last-read is read and written with the rest of
// the document and has no life of its own (design D1).
const lastReadSchema = new Schema(
  {
    surahNumber: { type: Number, required: true },
    surahName: { type: String, required: true },
    ayahNumber: { type: Number, required: true },
    updatedAt: { type: Date, required: true },
  },
  { _id: false },
);

const progressSchema = new Schema<IUserProgressDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    // Mongoose Buffer maps to BSON Binary.
    coverage: { type: Buffer, required: true, default: createEmptyCoverage },
    // Date-only 'YYYY-MM-DD'; never a timestamp (design D5).
    lastActiveDay: { type: String, default: null },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastRead: { type: lastReadSchema, default: null },
    // Bumped on every coverage write; see recordAyahs.
    rev: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

export const UserProgress = model<IUserProgressDocument, IUserProgressModel>(
  'UserProgress',
  progressSchema,
);
