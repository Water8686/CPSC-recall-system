import { describe, it, expect } from 'vitest';
import { parseRecallCsv } from './csvRecallImport.js';

describe('parseRecallCsv', () => {
  it('parses headers and rows', () => {
    const csv = `recall_number,title,product,hazard
26-001,Test recall,Test product,Fire
`;
    const { records, rowErrors } = parseRecallCsv(csv);
    expect(rowErrors).toHaveLength(0);
    expect(records).toHaveLength(1);
    expect(records[0].recall_number).toBe('26-001');
    expect(records[0].recall_title).toBe('Test recall');
    expect(records[0].product_name).toBe('Test product');
    expect(records[0].hazard).toBe('Fire');
  });

  it('reports missing recall_number', () => {
    const csv = `recall_number,title
,No id
`;
    const { records, rowErrors } = parseRecallCsv(csv);
    expect(records).toHaveLength(0);
    expect(rowErrors.some((e) => e.message.includes('recall_number'))).toBe(true);
  });

  it('strips BOM', () => {
    const csv = '\uFEFFrecall_number,title\n26-002,BOM row\n';
    const { records, rowErrors } = parseRecallCsv(csv);
    expect(rowErrors).toHaveLength(0);
    expect(records[0].recall_number).toBe('26-002');
  });
});
