import { Document, Model, Types } from 'mongoose';

export interface IBookmark {
  user: Types.ObjectId;
  surahNumber: number;
  /** 0 is the sentinel for a surah-level favourite; >=1 is a specific ayah. */
  ayahNumber: number;
  note?: string;
}

export interface IBookmarkDocument extends IBookmark, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type IBookmarkModel = Model<IBookmarkDocument>;
