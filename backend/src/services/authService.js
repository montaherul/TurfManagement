import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/ApiError.js';
import { comparePassword, generateTokens } from '../utils/auth.js';
import { env } from '../config/env.js';
import { otpRepository, otpConfig } from '../repositories/otpRepository.js';

const STAFF_ROLES = ['platform_admin', 'facility_owner', 'manager', 'operator'];

export const createAuthService = ({
  userRepository,
  facilityRepository,
  auditLogRepository,
  notificationService,
}) => {
  const buildSession = async (user) => {
    const { accessToken, refreshToken } = generateTokens(user.id, user.role, user.facilityId || null);
    const { passwordHash: _passwordHash, ...publicUser } = user;
    return { user: publicUser, accessToken, refreshToken };
  };

  /**
   * Owner onboarding application — creates a PENDING Facility. The owner
   * account is created by the platform admin at approval time.
   */
  const applyForFacility = async ({
    facilityName,
    ownerName,
    ownerEmail,
    ownerPhone,
    phone,
    email,
    address,
    description,
    ipAddress,
  }) => {
    const existing = await facilityRepository.findFirst({
      OR: [{ email: ownerEmail }, { phone: ownerPhone }],
    });
    if (existing && existing.status === 'PENDING') {
      throw new AppError(409, 'An application with this contact already exists', { code: 'APPLICATION_EXISTS' });
    }
    if (existing && existing.status !== 'REJECTED') {
      throw new AppError(409, 'A facility with this contact is already registered', { code: 'FACILITY_EXISTS' });
    }

    const facility = await facilityRepository.create({
      name: facilityName,
      slug: facilityRepository.createSlug(facilityName),
      status: 'PENDING',
      phone: phone || ownerPhone,
      email: email || ownerEmail,
      address: address || null,
      description: description || null,
      application: {
        ownerName,
        ownerEmail,
        ownerPhone,
        documentNote: null,
        reviewedBy: null,
        reviewedAt: null,
        rejectionReason: null,
      },
    });

    await auditLogRepository.create({
      facilityId: facility.id,
      action: 'facility.apply',
      resource: 'facility',
      resourceId: facility.id,
      details: { ownerName, ownerEmail },
      ipAddress: ipAddress || null,
    });

    await notificationService.notifyPlatform('facility:applied', {
      facilityId: facility.id,
      facilityName: facility.name,
      ownerName,
      ownerEmail,
    });

    return facility;
  };

  const login = async ({ email, password, ipAddress }) => {
    const user = await userRepository.findByEmail(email);
    if (!user || !STAFF_ROLES.includes(user.role)) {
      throw new AppError(401, 'Invalid email or password', { code: 'INVALID_CREDENTIALS' });
    }
    if (!user.passwordHash) {
      throw new AppError(401, 'Invalid email or password', { code: 'INVALID_CREDENTIALS' });
    }

    const isPasswordCorrect = await comparePassword(password, user.passwordHash);
    if (!isPasswordCorrect) {
      throw new AppError(401, 'Invalid email or password', { code: 'INVALID_CREDENTIALS' });
    }

    if (!user.isActive) {
      throw new AppError(403, 'Your account has been deactivated', { code: 'ACCOUNT_DEACTIVATED' });
    }

    await userRepository.update(user.id, { lastLoginAt: new Date() });
    await auditLogRepository.create({
      facilityId: user.facilityId,
      userId: user.id,
      action: 'auth.login',
      resource: 'user',
      resourceId: user.id,
      ipAddress: ipAddress || null,
    });

    return buildSession(user);
  };

  /**
   * Customer OTP login — sends a 6-digit code to the mobile number.
   * Rate limited to 5 requests per hour per mobile.
   */
  const requestOtp = async ({ mobile, purpose = 'LOGIN', ipAddress }) => {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await otpRepository.countRecent(mobile, purpose, hourAgo);
    if (recent >= otpConfig.maxPerHour) {
      throw new AppError(429, 'Too many OTP requests. Try again later.', { code: 'OTP_RATE_LIMITED' });
    }

    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const expiresAt = new Date(Date.now() + otpConfig.ttlMinutes * 60 * 1000);
    await otpRepository.create({ mobile, code, purpose, expiresAt, attempts: 0 });

    await auditLogRepository.create({
      action: 'auth.otp.request',
      resource: 'otp',
      details: { mobile, purpose },
      ipAddress: ipAddress || null,
    });

    // No SMS provider configured — the code is returned for dev/testing and
    // logged. In production, send via the configured SMS gateway.
    return { ok: true, devCode: code, expiresInMinutes: otpConfig.ttlMinutes };
  };

  const verifyOtp = async ({ mobile, code, purpose = 'LOGIN', ipAddress }) => {
    const latest = await otpRepository.findLatest(mobile, purpose);
    if (!latest) {
      throw new AppError(401, 'No OTP found for this number', { code: 'INVALID_OTP' });
    }
    if (latest.attempts >= otpConfig.maxAttempts) {
      throw new AppError(429, 'Too many failed attempts. Request a new code.', { code: 'OTP_MAX_ATTEMPTS' });
    }
    if (latest.expiresAt < new Date()) {
      throw new AppError(401, 'OTP has expired. Request a new code.', { code: 'OTP_EXPIRED' });
    }
    if (latest.code !== code) {
      await otpRepository.markAttempt(latest.id, latest.attempts + 1);
      throw new AppError(401, 'Invalid OTP code', { code: 'INVALID_OTP' });
    }

    await otpRepository.deleteUsed(mobile, purpose);

    let user = await userRepository.findByMobile(mobile);
    if (!user) {
      user = await userRepository.create({
        mobile,
        role: 'booker',
        isActive: true,
        firstName: null,
        lastName: null,
        notificationPreferences: { email: false, inApp: true, sms: true },
      });
    }
    if (!user.isActive) {
      throw new AppError(403, 'Your account has been deactivated', { code: 'ACCOUNT_DEACTIVATED' });
    }

    await userRepository.update(user.id, { lastLoginAt: new Date() });
    await auditLogRepository.create({
      userId: user.id,
      action: 'auth.otp.verify',
      resource: 'user',
      resourceId: user.id,
      details: { mobile, purpose },
      ipAddress: ipAddress || null,
    });

    return buildSession(user);
  };

  const refresh = async (token) => {
    let decoded;
    try {
      decoded = jwt.verify(token, env.jwtRefreshSecret);
    } catch {
      throw new AppError(401, 'Invalid refresh token', { code: 'INVALID_REFRESH_TOKEN' });
    }

    const user = await verifyActiveUser(decoded.userId);
    return buildSession(user);
  };

  const getProfile = async (userId) => {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError(404, 'User not found', { code: 'NOT_FOUND' });
    }
    return user;
  };

  const verifyActiveUser = async (userId) => {
    const user = await userRepository.findById(userId);
    if (!user || !user.isActive) {
      throw new AppError(401, 'Invalid refresh token', { code: 'INVALID_REFRESH_TOKEN' });
    }
    return user;
  };

  return { applyForFacility, login, requestOtp, verifyOtp, refresh, getProfile, verifyActiveUser, buildSession };
};

export default createAuthService;