import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import healthRoutes from './routes/health.js';
import recallRoutes from './routes/recalls.js';
import prioritizationRoutes from './routes/prioritizations.js';
import profileRoutes from './routes/profile.js';
import adminProfilesRoutes from './routes/adminProfiles.js';
import violationsRoutes from './routes/violations.js';
import violationResponsesRoutes from './routes/violationResponses.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const app = express();
const PORT = Number(process.env.PORT) || 3001;

const clientDist = path.join(__dirname, '../../client/dist');

// Bearer JWT only (no cookie session). If CLIENT_ORIGIN is set, restrict; else reflect any origin (Railway-friendly).
if (process.env.CLIENT_ORIGIN) {
  const origins = process.env.CLIENT_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean);
  app.use(cors({ origin: origins }));
} else {
  app.use(cors({ origin: true }));
}
app.use(express.json());

app.use('/api', healthRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin/profiles', adminProfilesRoutes);
app.use('/api/violations', violationsRoutes);
app.use('/api/violation-responses', violationResponsesRoutes);
app.use('/api/recalls', recallRoutes);
app.use('/api/prioritizations', prioritizationRoutes);

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
