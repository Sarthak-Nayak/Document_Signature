import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const env = {
  port: parseInt(process.env.PORT || '5000', 10),
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/document-signature',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
  jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
  jwtRefreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  uploadDir: path.resolve(process.env.UPLOAD_DIR || 'uploads'),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
};
