import { services } from '../config/container.js';

/**
 * Permission guard — checks the user's effective permissions (role defaults,
 * platform/org role rows and per-user overrides) for any of the given actions.
 */
export const permit = (...actions) => async (req, res, next) => {
  try {
    const allowed = await services.permissions.hasAnyPermission(req.user, actions);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action',
        code: 'FORBIDDEN',
      });
    }
    next();
  } catch (error) {
    next(error);
  }
};

export default permit;