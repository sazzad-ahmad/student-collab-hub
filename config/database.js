import mysql from 'mysql2/promise';
import { env } from './env.js';

const enableSSL =
  process.env.DB_SSL === 'true' ||
  (process.env.NODE_ENV === 'production' && process.env.DB_SSL !== 'false');

export const pool = mysql.createPool({
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

export async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('✅ Database connected successfully');
    conn.release();
    return true;
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    return false;
  }
}

export async function query(sql, params) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function queryOne(sql, params) {
  const rows = await query(sql, params);
  return rows[0] ?? null;
}

export async function transaction(callback) {
  const conn = await pool.getConnection();
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