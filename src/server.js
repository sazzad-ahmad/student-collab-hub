import { createApp } from './app.js';
import { env } from '../config/env.js';
import { testConnection } from '../config/database.js';

async function startServer() {
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.warn('⚠️  Database not connected. Running in limited mode.');
  }

  const app = createApp();

  app.listen(env.PORT, () => {
    console.log(`🚀 Server running on http://localhost:${env.PORT}`);
    console.log(`📝 Environment: ${env.NODE_ENV}`);
    if (!dbConnected) {
      console.log(`⚠️  Database unavailable - API endpoints will return errors`);
    }
  });
}

startServer().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});