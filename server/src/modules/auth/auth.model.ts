import bcrypt from 'bcryptjs';
import { Schema, model } from 'mongoose';
import { IUserDocument, IUserModel } from './auth.interface';

const userSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // select:false keeps the hash out of every query unless explicitly requested.
    password: { type: String, required: true, select: false },
  },
  { timestamps: true },
);

// Hash the password whenever it is set/changed.
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

export const User = model<IUserDocument, IUserModel>('User', userSchema);
