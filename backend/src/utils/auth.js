import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { config } from 'dotenv';

config();

export const generateTokens = (userId, role, facilityId) => {
  const accessToken = jwt.sign(
    { userId, role, facilityId, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

export const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

export const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

export const generateInviteToken = () => {
  return crypto.randomBytes(32).toString('hex');
};