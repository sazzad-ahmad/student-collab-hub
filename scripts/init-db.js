import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/database.js';
import { env } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

async function initDatabase() {
  console.log('🔧 Initializing database...');

  const schemaPath = path.join(projectRoot, 'database', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    try {
      await pool.query(statement);
    } catch (err) {
      if (err.code === 'ER_TABLE_EXISTS_ERROR' || err.code === 'ER_DB_CREATE_EXISTS') {
        continue;
      }
      console.error('❌ Error executing statement:', err.message);
      console.error('Statement:', statement.substring(0, 100) + '...');
      throw err;
    }
  }

  console.log('✅ Database initialized successfully');
  await pool.end();
  process.exit(0);
}

initDatabase().catch((err) => {
  console.error('❌ Database initialization failed:', err);
  process.exit(1);
});