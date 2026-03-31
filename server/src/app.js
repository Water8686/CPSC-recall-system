import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import adminUsersRoutes from './routes/adminUsers.js';
import adminRecallImportRoutes from './routes/adminRecallImport.js';
import recallRoutes from './routes/recalls.js';
import prioritizationRoutes from './routes/prioritizations.js';
import assignmentRoutes from './routes/assignments.js';
import usersRoutes from './routes/users.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Express app factory — used by index.js (listen) and API tests (supertest).
 */
export function createApp() {
  const app = express();

  const clientDist = path.join(__dirname, '../../client/dist');

  if (process.env.CLIENT_ORIGIN) {
    const origins = process.env.CLIENT_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean);
    app.use(cors({ origin: origins }));
  } else {
    app.use(cors({ origin: true }));
  }
  app.use(express.json());

  app.use('/api', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminUsersRoutes);
  app.use('/api/admin', adminRecallImportRoutes);
  app.use('/api/recalls', recallRoutes);
  app.use('/api/prioritizations', prioritizationRoutes);
  app.use('/api/assignments', assignmentRoutes);
  app.use('/api/users', usersRoutes);

  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  return app;
}
