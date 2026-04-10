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
import investigatorRoutes from './routes/investigators.js';
import usersRoutes from './routes/users.js';
import listingRoutes from './routes/listings.js';
import listingSearchRoutes from './routes/listingSearch.js';
import listingDiscoveryRoutes from './routes/listingDiscovery.js';
import violationRoutes from './routes/violations.js';
import contactRoutes from './routes/contacts.js';
import responseRoutes from './routes/responses.js';
import adjudicationRoutes from './routes/adjudications.js';
import statsRoutes from './routes/stats.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Express app factory — used by index.js (listen) and API tests (supertest).
 */
export function createApp() {
  const app = express();
  // Railway / reverse proxies: req.ip and X-Forwarded-For are wrong without this.
  app.set('trust proxy', 1);

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
  app.use('/api/investigators', investigatorRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/listings', listingSearchRoutes);
  app.use('/api/listings', listingRoutes);
  app.use('/api/discovery', listingDiscoveryRoutes);
  app.use('/api/violations', violationRoutes);
  app.use('/api/contacts', contactRoutes);
  app.use('/api/responses', responseRoutes);
  app.use('/api/adjudications', adjudicationRoutes);
  app.use('/api/stats', statsRoutes);

  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  return app;
}
