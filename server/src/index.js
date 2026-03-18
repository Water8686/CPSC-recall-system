import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import healthRoutes from './routes/health.js';
import recallRoutes from './routes/recalls.js';
import prioritizationRoutes from './routes/prioritizations.js';

// Load .env from project root
dotenv.config({ path: '../../.env' });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Routes
app.use('/api', healthRoutes);
app.use('/api/recalls', recallRoutes);
app.use('/api/prioritizations', prioritizationRoutes);

// Future route files:
// app.use('/api/violations', violationRoutes);  // Sprint 2
// app.use('/api/responses', responseRoutes);    // Sprint 3
// app.use('/api/adjudications', adjRoutes);     // Sprint 3

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
