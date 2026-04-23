import { createApp } from './app.js';
import { startWeeklyCpscImportScheduler } from './lib/cpscWeeklyImportScheduler.js';

const app = createApp();
const PORT = Number(process.env.PORT) || 3001;

if (
  process.env.NODE_ENV === 'production' &&
  (!process.env.APP_JWT_SECRET || process.env.APP_JWT_SECRET.length < 8)
) {
  console.error(
    '[cpsc] Production requires APP_JWT_SECRET (min 8 characters). Login will return 503 until it is set.',
  );
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});

startWeeklyCpscImportScheduler();
