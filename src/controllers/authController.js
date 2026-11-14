import { validationResult } from 'express-validator';
import * as authService from '../services/authService.js';
import { sendSuccess, sendError } from '../utils/responses.js';
import { generateToken } from '../utils/jwt.js';

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    sendError(res, {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: errors.array(),
      statusCode: 400,
    });
    return false;
  }
  return true;
}

function createAuthResponse(user) {
  const token = generateToken({ userId: user.id, role: user.role });
  return { user, token };
}

export async function register(req, res) {
  if (!handleValidation(req, res)) return;

  try {
    const user = await authService.registerUser(req.body);
    const authResponse = createAuthResponse(user);
    
    // Also set session for backward compatibility
    req.session.userId = user.id;
    req.session.userRole = user.role;
    
    sendSuccess(res, authResponse, 'Registration successful', 201);
  } catch (err) {
    sendError(res, err);
  }
}

export async function login(req, res) {
  if (!handleValidation(req, res)) return;

  try {
    const user = await authService.loginUser(req.body);
    const authResponse = createAuthResponse(user);
    
    // Also set session for backward compatibility
    req.session.userId = user.id;
    req.session.userRole = user.role;
    
    sendSuccess(res, authResponse, 'Login successful');
  } catch (err) {
    sendError(res, err);
  }
}

export async function logout(req, res) {
  req.session.destroy((err) => {
    if (err) {
      return sendError(res, {
        code: 'INTERNAL_ERROR',
        message: 'Failed to logout',
        statusCode: 500,
      });
    }
    res.clearCookie('connect.sid');
    sendSuccess(res, null, 'Logged out successfully');
  });
}

export async function me(req, res) {
  try {
    const user = await authService.getUserById(req.user.id);
    if (!user) {
      return sendError(res, {
        code: 'NOT_FOUND',
        message: 'User not found',
        statusCode: 404,
      });
    }
    sendSuccess(res, { user });
  } catch (err) {
    sendError(res, err);
  }
}