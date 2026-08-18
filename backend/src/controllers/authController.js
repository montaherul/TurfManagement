import { successResponse } from '../utils/asyncHandler.js';
import { env } from '../config/env.js';

const REFRESH_COOKIE = 'refreshToken';

const setRefreshCookie = (res, token) => {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export const createAuthController = ({ authService }) => {
  const applyForFacility = async (req, res) => {
    const facility = await authService.applyForFacility({
      ...req.body,
      ipAddress: req.ip,
    });
    return successResponse(
      res,
      { facility },
      'Application submitted. Our team will review it shortly.',
      201
    );
  };

  const login = async (req, res) => {
    const session = await authService.login({ ...req.body, ipAddress: req.ip });
    setRefreshCookie(res, session.refreshToken);
    return successResponse(res, {
      user: session.user,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    }, 'Login successful');
  };

  const requestOtp = async (req, res) => {
    const result = await authService.requestOtp({ ...req.body, ipAddress: req.ip });
    return successResponse(res, result, 'OTP sent');
  };

  const verifyOtp = async (req, res) => {
    const session = await authService.verifyOtp({ ...req.body, ipAddress: req.ip });
    setRefreshCookie(res, session.refreshToken);
    return successResponse(res, {
      user: session.user,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    }, 'OTP verified');
  };

  const refresh = async (req, res) => {
    const token = req.body?.refreshToken || req.cookies?.[REFRESH_COOKIE] || req.headers['x-refresh-token'];
    const session = await authService.refresh(token);
    setRefreshCookie(res, session.refreshToken);
    return successResponse(res, {
      user: session.user,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    }, 'Token refreshed');
  };

  const logout = async (req, res) => {
    res.clearCookie(REFRESH_COOKIE);
    return successResponse(res, null, 'Logged out');
  };

  const me = async (req, res) => {
    const user = await authService.getProfile(req.user.userId);
    return successResponse(res, { user }, 'Profile retrieved');
  };

  return { applyForFacility, login, requestOtp, verifyOtp, refresh, logout, me };
};

export default createAuthController;