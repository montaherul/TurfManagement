import { prisma } from '../config/db.js';

const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MAX_PER_HOUR = 5;

export const otpRepository = {
  create: (data) =>
    prisma.otpCode.create({ data }),

  findLatest: (mobile, purpose) =>
    prisma.otpCode.findFirst({
      where: { mobile, purpose },
      orderBy: { createdAt: 'desc' },
    }),

  countRecent: (mobile, purpose, since) =>
    prisma.otpCode.count({
      where: { mobile, purpose, createdAt: { gte: since } },
    }),

  markAttempt: (id, attempts) =>
    prisma.otpCode.update({ where: { id }, data: { attempts } }),

  deleteUsed: (mobile, purpose) =>
    prisma.otpCode.deleteMany({ where: { mobile, purpose, expiresAt: { lt: new Date() } } }),
};

export const otpConfig = {
  ttlMinutes: OTP_TTL_MINUTES,
  maxAttempts: OTP_MAX_ATTEMPTS,
  maxPerHour: OTP_MAX_PER_HOUR,
};

export default otpRepository;