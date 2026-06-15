import { Document, Model, Types } from 'mongoose';

export interface IUser {
  name: string;
  email: string;
  password: string;
}

export interface IUserDocument extends IUser, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

export type IUserModel = Model<IUserDocument>;

/** Shape returned to clients — never includes the password hash. */
export interface SafeUser {
  id: string;
  name: string;
  email: string;
}
