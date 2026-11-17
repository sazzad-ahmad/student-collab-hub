import mysql from 'mysql2/promise';
import { env } from './env.js';

// Determine whether SSL should be enabled (Vercel production or explicit DB_SSL flag)
const enableSSL =
  process.env.DB_SSL === 'true' ||
  (process.env.NODE_ENV === 'production' && process.env.DB_SSL !== 'false');

let pool = null;

function initPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      namedPlaceholders: true,
      charset: 'utf8mb4',
      ...(enableSSL ? { ssl: { rejectUnauthorized: true } } : {}),
    });
  }
  return pool;
}

export async function testConnection() {
  try {
    const conn = await initPool().getConnection();
    console.log('✅ Database connected successfully');
    conn.release();
    return true;
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    return false;
  }
}

export async function query(sql, params) {
  const [rows] = await initPool().execute(sql, params);
  return rows;
}

export async function queryOne(sql, params) {
  const rows = await query(sql, params);
  return rows[0] ?? null;
}

export async function transaction(callback) {
  const conn = await initPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
