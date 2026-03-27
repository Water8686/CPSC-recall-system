/**
 * Generates INSERT fragments for recall + prioritization from server mockData.
 * Run: node scripts/generate-benscpsc-seed.mjs
 */
import { getAllRecalls, getAllPrioritizations } from '../server/src/data/mockData.js';

const rank = { High: 1, Medium: 2, Low: 3 };

function esc(s) {
  if (s == null) return 'NULL';
  return `'${String(s).replace(/'/g, "''")}'`;
}

const recallRows = getAllRecalls();
const lines = recallRows.map(
  (r) =>
    `  (${esc(r.recall_id)}, ${esc(r.title)}, ${esc(r.product)}, ${esc(r.product)}, ${esc(r.hazard)}, ${esc(r.created_at)}::timestamptz, NULL)`,
);
console.log('-- Recalls (generated)');
console.log(`INSERT INTO public.recall (recall_number, recall_title, product_name, product_type, hazard, recall_date, last_publish_date) VALUES\n${lines.join(',\n')};`);

const prios = getAllPrioritizations();
console.log('\n-- Prioritizations (generated; recall_id resolved in init script via subquery)');
for (const p of prios) {
  const rk = rank[p.priority] ?? 2;
  console.log(
    `INSERT INTO public.prioritization (recall_id, priority_rank, prioritized_at, user_id) SELECT recall_id, ${rk}, ${esc(p.prioritized_at)}::timestamptz, '00000001-0001-4001-8001-000000000001'::uuid FROM public.recall WHERE recall_number = ${esc(p.recall_id)};`,
  );
}
