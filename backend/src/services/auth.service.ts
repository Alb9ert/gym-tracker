import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/tokens';

export async function register(email: string, password: string, name: string) {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw AppError.conflict('An account with this email already exists');

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ email, passwordHash, name });

  const accessToken = signAccessToken({ userId: user.id, email: user.email });
  const refreshToken = signRefreshToken({ userId: user.id });

  return { accessToken, refreshToken, user: { id: user.id, email: user.email, name: user.name } };
}

export async function login(email: string, password: string) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw AppError.invalidCredentials();

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw AppError.invalidCredentials();

  const accessToken = signAccessToken({ userId: user.id, email: user.email });
  const refreshToken = signRefreshToken({ userId: user.id });

  return { accessToken, refreshToken, user: { id: user.id, email: user.email, name: user.name } };
}

export async function refresh(token: string) {
  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw AppError.unauthorized('Invalid or expired refresh token');
  }

  const user = await User.findById(payload.userId);
  if (!user) throw AppError.unauthorized('User not found');

  const accessToken = signAccessToken({ userId: user.id, email: user.email });
  const refreshToken = signRefreshToken({ userId: user.id });

  return { accessToken, refreshToken, user: { id: user.id, email: user.email, name: user.name } };
}

export async function getMe(userId: string) {
  const user = await User.findById(userId).select('-passwordHash');
  if (!user) throw AppError.notFound('User');
  return { id: user.id, email: user.email, name: user.name };
}
