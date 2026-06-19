import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import { ensureUploadDir } from './utils/pdf.js';
import authRoutes from './routes/auth.js';
import docsRoutes from './routes/docs.js';
import signaturesRoutes from './routes/signatures.js';
import auditRoutes from './routes/audit.js';

const app = express();

app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/docs', docsRoutes);
app.use('/api/signatures', signaturesRoutes);
app.use('/api/audit', auditRoutes);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: err.message || 'Internal server error' });
});

async function start() {
  await ensureUploadDir();

  await mongoose.connect(env.mongoUri);
  console.log('Connected to MongoDB');

  app.listen(env.port, () => {
    console.log(`Server running on http://localhost:${env.port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
