import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

export function generateToken(payload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, env.JWT_SECRET);
  } catch (err) {
    return null;
  }
}

export function decodeToken(token) {
  return jwt.decode(token);
}