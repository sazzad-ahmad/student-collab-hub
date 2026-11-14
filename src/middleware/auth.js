import { sendError, ERROR_CODES } from '../utils/responses.js';
import { verifyToken } from '../utils/jwt.js';

export function requireAuth(req, res, next) {
  // Check for JWT token in Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = { id: decoded.userId, role: decoded.role };
      req.authType = 'jwt';
      return next();
    }
  }

  // Fallback to session-based auth
  if (!req.session?.userId) {
    return sendError(res, {
      code: ERROR_CODES.UNAUTHORIZED,
      message: 'Authentication required',
      statusCode: 401,
    });
  }

  req.user = { id: req.session.userId, role: req.session.userRole };
  req.authType = 'session';
  next();
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user?.id) {
      return sendError(res, {
        code: ERROR_CODES.UNAUTHORIZED,
        message: 'Authentication required',
        statusCode: 401,
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, {
        code: ERROR_CODES.FORBIDDEN,
        message: 'Insufficient permissions',
        statusCode: 403,
      });
    }

    next();
  };
}

export function attachUser(req, res, next) {
  req.user = {
    id: req.session?.userId,
    role: req.session?.userRole,
  };
  next();
}

export function optionalAuth(req, res, next) {
  // Check for JWT token
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = { id: decoded.userId, role: decoded.role };
      req.authType = 'jwt';
      return next();
    }
  }

  // Fallback to session
  if (req.session?.userId) {
    req.user = { id: req.session.userId, role: req.session.userRole };
    req.authType = 'session';
  }

  next();
}