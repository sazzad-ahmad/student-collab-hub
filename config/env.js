import dotenv from 'dotenv';

dotenv.config();

function required(key) {
  const value = process.env[key];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optional(key, defaultValue) {
  const value = process.env[key];
  return value !== undefined && value !== '' ? value : defaultValue;
}

export const env = {
  PORT: parseInt(optional('PORT', '3000'), 10),
  NODE_ENV: optional('NODE_ENV', 'development'),

  DB_HOST: required('DB_HOST'),
  DB_PORT: parseInt(required('DB_PORT'), 10),
  DB_USER: required('DB_USER'),
  DB_PASSWORD: process.env.DB_PASSWORD ?? '', // Allow empty password for local dev
  DB_NAME: required('DB_NAME'),
  DB_SSL: optional('DB_SSL', 'false'),

  SESSION_SECRET: required('SESSION_SECRET'),
  SESSION_NAME: optional('SESSION_NAME', 'connect.sid'),
  SESSION_COOKIE_SECURE: optional('SESSION_COOKIE_SECURE', 'false') === 'true',
  SESSION_COOKIE_HTTP_ONLY: optional('SESSION_COOKIE_HTTP_ONLY', 'true') !== 'false',
  SESSION_COOKIE_SAME_SITE: optional('SESSION_COOKIE_SAME_SITE', 'lax'),
  SESSION_MAX_AGE: parseInt(optional('SESSION_MAX_AGE', '86400000'), 10),

  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN: optional('JWT_EXPIRES_IN', '7d'),

  CLIENT_ORIGIN: optional('CLIENT_ORIGIN', 'http://localhost:3000'),
};

export const isProduction = env.NODE_ENV === 'production';