import { successResponse } from '../utils/asyncHandler.js';
import { AppError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const setRefreshCookie = (res, token) => {
  res.cookie('refreshToken', token, REFRESH_COOKIE_OPTS);
};

export const createAuthController = ({ authService }) => {
  const register = async (req, res) => {
    const { user, accessToken, refreshToken } = await authService.register({
      email: req.body.email,
      password: req.body.password,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      organizationName: req.body.organizationName || req.body.orgName,
      organizationSlug: req.body.organizationSlug,
      ipAddress: req.ip,
    });

    setRefreshCookie(res, refreshToken);
    return successResponse(res, { user, accessToken }, 'User registered successfully', 201);
  };

  const login = async (req, res) => {
    const { user, accessToken, refreshToken } = await authService.login({
      email: req.body.email,
      password: req.body.password,
      ipAddress: req.ip,
    });

    setRefreshCookie(res, refreshToken);
    return successResponse(res, { user, accessToken }, 'Login successful');
  };

  const refresh = async (req, res) => {
    const token = req.cookies?.refreshToken || req.headers['x-refresh-token'];
    if (!token) {
      throw new AppError(401, 'Refresh token missing', { code: 'REFRESH_TOKEN_MISSING' });
    }

    const { accessToken, refreshToken } = await authService.refresh(token);
    setRefreshCookie(res, refreshToken);
    return successResponse(res, { accessToken }, 'Token refreshed');
  };

  const logout = async (req, res) => {
    res.clearCookie('refreshToken', REFRESH_COOKIE_OPTS);
    return successResponse(res, null, 'Logout successful');
  };

  const me = async (req, res) => {
    const user = await authService.getProfile(req.user.userId);
    return successResponse(res, { user });
  };

  return { register, login, refresh, logout, me };
};

export default createAuthController;