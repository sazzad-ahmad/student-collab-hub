import session from 'express-session';
import MySQLStore from 'express-mysql-session';
import { pool } from './database.js';
import { env, isProduction } from './env.js';

const MySQLStoreSession = MySQLStore(session);

export const sessionStore = new MySQLStoreSession(
  {
    clearExpired: true,
    checkExpirationInterval: 900000,
    expiration: env.SESSION_MAX_AGE,
    createDatabaseTable: true,
    schema: {
      tableName: 'sessions',
      columnNames: {
        session_id: 'session_id',
        expires: 'expires',
        data: 'data',
      },
    },
  },
  pool
);

export const sessionMiddleware = session({
  name: env.SESSION_NAME,
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    secure: env.SESSION_COOKIE_SECURE,
    httpOnly: env.SESSION_COOKIE_HTTP_ONLY,
    sameSite: env.SESSION_COOKIE_SAME_SITE,
    maxAge: env.SESSION_MAX_AGE,
  },
});

sessionStore.on('error', (err) => {
  console.error('❌ Session store error:', err);
});