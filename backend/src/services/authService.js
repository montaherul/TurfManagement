import { AppError } from '../utils/ApiError.js';
import { hashPassword, comparePassword, generateTokens } from '../utils/auth.js';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { PLANS } from './planLimitService.js';

export const createAuthService = ({
  userRepository,
  organizationRepository,
  subscriptionRepository,
  auditLogRepository,
}) => {
  const buildSession = async (user) => {
    const { accessToken, refreshToken } = generateTokens(user.id, user.role, user.organizationId);
    return { user, accessToken, refreshToken };
  };

  const register = async ({ email, password, firstName, lastName, organizationName, organizationSlug, ipAddress }) => {
    const existing = await userRepository.findByEmailPublic(email);
    if (existing) {
      throw new AppError(409, 'User with this email already exists', { code: 'EMAIL_TAKEN' });
    }

    const passwordHash = await hashPassword(password);
    let organizationId = null;
    let role = 'viewer';

    if (organizationName) {
      const slug = organizationRepository.createSlug(organizationName);
      const org = await organizationRepository.create({
        name: organizationName,
        slug,
        settings: {},
        subscription: { planId: 'free' },
      });
      organizationId = org.id;
      role = 'org_admin';

      await subscriptionRepository.create({
        organizationId: org.id,
        planId: 'free',
        status: 'active',
        billingModel: 'subscription',
        inspectionsUsed: 0,
        inspectionsLimit: PLANS.free.inspections,
        amountBDT: 0,
        currency: 'BDT',
      });
    } else if (organizationSlug) {
      const org = await organizationRepository.findBySlug(organizationSlug);
      if (!org) {
        throw new AppError(404, 'Organization not found', { code: 'ORG_NOT_FOUND' });
      }
      organizationId = org.id;
      role = 'viewer';
    } else {
      throw new AppError(422, 'Organization name or organization slug is required', {
        code: 'ORG_REQUIRED',
      });
    }

    const user = await userRepository.create({
      email,
      passwordHash,
      firstName,
      lastName,
      role,
      organizationId,
      isActive: true,
      notificationPreferences: { email: true, inApp: true, sms: false },
    });

    await auditLogRepository.create({
      organizationId,
      userId: user.id,
      action: 'auth.register',
      resource: 'user',
      resourceId: user.id,
      details: { email: user.email, role: user.role },
      ipAddress: ipAddress || null,
    });

    return buildSession(user);
  };

  const login = async ({ email, password, ipAddress }) => {
    const user = await userRepository.findByEmail(email);
    if (!user) {
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
      organizationId: user.organizationId,
      userId: user.id,
      action: 'auth.login',
      resource: 'user',
      resourceId: user.id,
      ipAddress: ipAddress || null,
    });

    const { passwordHash: _passwordHash, ...publicUser } = user;
    return buildSession(publicUser);
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

  return { register, login, refresh, getProfile, verifyActiveUser, buildSession };
};

export default createAuthService;