import { AppError } from '../../utils/AppError';
import { signToken } from '../../utils/jwt';
import { IUserDocument, SafeUser } from './auth.interface';
import { User } from './auth.model';
import { LoginInput, RegisterInput } from './auth.validation';

/** Strip a user document down to the client-safe shape. */
const toSafeUser = (user: IUserDocument): SafeUser => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
});

/**
 * Register a new user. Rejects duplicate emails with 409.
 * Returns the safe user plus a signed JWT for the auth cookie.
 */
const register = async (input: RegisterInput): Promise<{ user: SafeUser; token: string }> => {
  const existing = await User.findOne({ email: input.email });
  if (existing) {
    throw new AppError(409, 'An account with this email already exists');
  }

  const user = await User.create(input);
  const token = signToken({ userId: user._id.toString() });
  return { user: toSafeUser(user), token };
};

/**
 * Authenticate by email + password. Returns the safe user and a signed JWT.
 * Uses a generic message to avoid leaking which field was wrong.
 */
const login = async (input: LoginInput): Promise<{ user: SafeUser; token: string }> => {
  const user = await User.findOne({ email: input.email }).select('+password');
  if (!user || !(await user.comparePassword(input.password))) {
    throw new AppError(401, 'Invalid email or password');
  }

  const token = signToken({ userId: user._id.toString() });
  return { user: toSafeUser(user), token };
};

/** Fetch the current user by id (used by GET /auth/me). */
const getCurrentUser = async (userId: string): Promise<SafeUser> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, 'User not found');
  }
  return toSafeUser(user);
};

export const authService = {
  register,
  login,
  getCurrentUser,
};
