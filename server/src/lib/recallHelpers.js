/**
 * Resolve recall primary key from API param (numeric id or recall_number string).
 */
export async function resolveRecallPk(admin, recallRef) {
  const raw = String(recallRef ?? '').trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) {
    const { data } = await admin
      .from('recall')
      .select('recall_id')
      .eq('recall_id', Number(raw))
      .maybeSingle();
    if (data?.recall_id != null) return data.recall_id;
  }
  const { data } = await admin
    .from('recall')
    .select('recall_id')
    .eq('recall_number', raw)
    .maybeSingle();
  return data?.recall_id ?? null;
}
