import { query, queryOne, transaction } from '../../config/database.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { error, ERROR_CODES } from '../utils/responses.js';

export async function registerUser({ email, password, fullName, role = 'student' }) {
  const existing = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) {
    throw error(ERROR_CODES.CONFLICT, 'Email already registered', null, 409);
  }

  const passwordHash = await hashPassword(password);

  const result = await query(
    `INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)`,
    [email, passwordHash, fullName, role]
  );

  const user = await queryOne(
    'SELECT id, email, full_name, role, avatar_url, created_at FROM users WHERE id = ?',
    [result.insertId]
  );

  return user;
}

export async function loginUser({ email, password }) {
  const user = await queryOne(
    'SELECT id, email, password_hash, full_name, role, avatar_url FROM users WHERE email = ?',
    [email]
  );

  if (!user) {
    throw error(ERROR_CODES.UNAUTHORIZED, 'Invalid email or password', null, 401);
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    throw error(ERROR_CODES.UNAUTHORIZED, 'Invalid email or password', null, 401);
  }

  const { password_hash, ...safeUser } = user;
  return safeUser;
}

export async function getUserById(id) {
  const user = await queryOne(
    'SELECT id, email, full_name, role, avatar_url, created_at FROM users WHERE id = ?',
    [id]
  );
  return user;
}

export async function getUsersByIds(ids) {
  if (!ids.length) return [];
  const placeholders = ids.map(() => '?').join(',');
  return query(
    `SELECT id, email, full_name, role, avatar_url FROM users WHERE id IN (${placeholders})`,
    ids
  );
}