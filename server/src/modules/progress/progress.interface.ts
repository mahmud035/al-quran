import { Document, Model, Types } from 'mongoose';
import { CalendarDay, StreakState } from './progress.streak';

export type { CalendarDay, StreakState };

/** Where the user resumes reading. Mirrors the client's local record (design D8). */
export interface ILastRead {
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  updatedAt: Date;
}

export interface IUserProgress {
  user: Types.ObjectId;
  /** 780-byte coverage bitmap, one bit per global ayah number (design D2). */
  coverage: Buffer;
  lastActiveDay: CalendarDay | null;
  currentStreak: number;
  longestStreak: number;
  lastRead?: ILastRead | null;
}

export interface IUserProgressDocument extends IUserProgress, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type IUserProgressModel = Model<IUserProgressDocument>;

/** The shape returned by GET /api/progress. The client mirrors this type exactly. */
export interface ProgressResponse {
  /** Base64 of the coverage bitmap. */
  coverage: string;
  khatmahPercent: number;
  streak: {
    /** Computed at read time against the caller's timezone (design D7). */
    current: number;
    longest: number;
    lastActiveDay: CalendarDay | null;
  };
  lastRead: ILastRead | null;
}
