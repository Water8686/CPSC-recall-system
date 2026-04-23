import cron from 'node-cron';
import { supabaseAdmin } from './supabase.js';
import { cpscItemsToRecallRecords, fetchCpscRecallsJson } from './cpscApiImport.js';
import { upsertRecallRecords } from './csvRecallImport.js';

const ET_TIME_ZONE = 'America/New_York';
const CPSC_IMPORT_CRON = '0 12 * * 4';
const CPSC_IMPORT_HUMAN_SCHEDULE = 'Thursdays at 12:00 PM America/New_York';

function toYmd(date) {
  return date.toISOString().slice(0, 10);
}

function ymdInTimeZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  if (!year || !month || !day) {
    throw new Error(`Unable to format date in timezone ${timeZone}`);
  }
  return `${year}-${month}-${day}`;
}

/**
 * Date window for "previous week" using ET calendar dates.
 * If run on Thursday ET, this yields the prior Thursday-Wednesday range.
 */
export function resolvePreviousWeekWindowEt(now = new Date()) {
  const etTodayYmd = ymdInTimeZone(now, ET_TIME_ZONE);
  const etTodayPseudoUtc = new Date(`${etTodayYmd}T00:00:00Z`);
  const end = new Date(etTodayPseudoUtc);
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(etTodayPseudoUtc);
  start.setUTCDate(start.getUTCDate() - 7);
  return { recallDateStart: toYmd(start), recallDateEnd: toYmd(end) };
}

export async function runScheduledWeeklyCpscImport() {
  if (!supabaseAdmin) {
    console.warn('[cpsc] Weekly import skipped: database client unavailable.');
    return;
  }
  const { recallDateStart, recallDateEnd } = resolvePreviousWeekWindowEt();
  const query = {
    recallDateStart,
    recallDateEnd,
    dateBasis: 'recall',
  };

  const { url, items } = await fetchCpscRecallsJson(query);
  const { records, skipped } = cpscItemsToRecallRecords(items);
  const { upserted, failed } =
    records.length > 0 ? await upsertRecallRecords(supabaseAdmin, records) : { upserted: 0, failed: [] };

  console.log(
    `[cpsc] Weekly import complete (${recallDateStart}..${recallDateEnd}) fetched=${items.length} upserted=${upserted} skipped=${skipped.length} failed=${failed.length}`,
  );
  console.log(`[cpsc] Weekly import source URL: ${url}`);
}

export function getCpscImportScheduleInfo(now = new Date()) {
  const enabled = process.env.CPSC_WEEKLY_IMPORT_ENABLED === 'true';
  const previewWindow = resolvePreviousWeekWindowEt(now);
  return {
    enabled,
    cron: CPSC_IMPORT_CRON,
    timezone: ET_TIME_ZONE,
    humanSchedule: CPSC_IMPORT_HUMAN_SCHEDULE,
    importWindow: {
      label: 'Previous 7 days ending yesterday (ET calendar date)',
      ...previewWindow,
    },
  };
}

export function startWeeklyCpscImportScheduler() {
  if (process.env.CPSC_WEEKLY_IMPORT_ENABLED !== 'true') {
    return null;
  }
  const task = cron.schedule(
    CPSC_IMPORT_CRON,
    async () => {
      try {
        await runScheduledWeeklyCpscImport();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[cpsc] Weekly import failed: ${message}`);
      }
    },
    { timezone: ET_TIME_ZONE },
  );
  console.log(`[cpsc] Weekly CPSC import scheduler enabled (${CPSC_IMPORT_HUMAN_SCHEDULE}).`);
  return task;
}
