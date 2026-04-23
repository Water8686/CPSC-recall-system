import { describe, expect, it } from 'vitest';
import { getCpscImportScheduleInfo, resolvePreviousWeekWindowEt } from './cpscWeeklyImportScheduler.js';

describe('resolvePreviousWeekWindowEt', () => {
  it('returns the previous 7-day window ending yesterday', () => {
    const now = new Date('2026-04-20T13:00:00.000Z'); // Monday 09:00 ET (EDT)
    const window = resolvePreviousWeekWindowEt(now);
    expect(window).toEqual({
      recallDateStart: '2026-04-13',
      recallDateEnd: '2026-04-19',
    });
  });

  it('uses ET date boundary rather than UTC date boundary', () => {
    const now = new Date('2026-04-20T03:30:00.000Z'); // Sunday 23:30 ET
    const window = resolvePreviousWeekWindowEt(now);
    expect(window).toEqual({
      recallDateStart: '2026-04-12',
      recallDateEnd: '2026-04-18',
    });
  });
});

describe('getCpscImportScheduleInfo', () => {
  it('returns Thursday noon ET schedule metadata', () => {
    const info = getCpscImportScheduleInfo(new Date('2026-04-23T16:00:00.000Z'));
    expect(info.cron).toBe('0 12 * * 4');
    expect(info.timezone).toBe('America/New_York');
    expect(info.humanSchedule).toContain('Thursdays');
  });
});
