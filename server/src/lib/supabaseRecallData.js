/**
 * Reads/writes Sprint 1 recall + prioritization data from Supabase (public.recall, public.prioritization).
 * Maps DB shape (numeric recall_id, recall_number, priority_rank) to the API/SPA shape.
 */

import { PRIORITY_LEVELS } from 'shared';

const RANK_TO_LABEL = {
  1: PRIORITY_LEVELS.HIGH,
  2: PRIORITY_LEVELS.MEDIUM,
  3: PRIORITY_LEVELS.LOW,
};

const LABEL_TO_RANK = {
  [PRIORITY_LEVELS.HIGH]: 1,
  [PRIORITY_LEVELS.MEDIUM]: 2,
  [PRIORITY_LEVELS.LOW]: 3,
};

function priorityLabelFromRank(rank) {
  if (rank == null) return null;
  return RANK_TO_LABEL[Number(rank)] ?? null;
}

function rankFromPriorityLabel(label) {
  return LABEL_TO_RANK[label] ?? null;
}

export function mapRecallRow(row) {
  if (!row) return null;
  const recallNumber = row.recall_number ?? '';
  return {
    id: String(row.recall_id),
    recall_id: recallNumber,
    title: row.recall_title ?? row.product_name ?? 'Recall',
    product: row.product_name ?? row.product_type ?? '',
    hazard: row.hazard ?? '',
    created_at: row.recall_date ?? row.last_publish_date ?? null,
  };
}

export function mapPrioritizationRow(row, recallNumberById) {
  if (!row) return null;
  const recallNum =
    recallNumberById?.get(row.recall_id) ?? String(row.recall_id);
  const priority =
    priorityLabelFromRank(row.priority_rank) ?? PRIORITY_LEVELS.MEDIUM;
  return {
    id: String(row.prioritization_id),
    recall_id: recallNum,
    priority,
    prioritized_at: row.prioritized_at ?? row.effective_start_at ?? null,
    user_id: row.user_id != null ? String(row.user_id) : null,
  };
}

export async function dbFetchRecalls(supabase) {
  const { data, error } = await supabase
    .from('recall')
    .select(
      'recall_id, recall_number, recall_title, product_name, product_type, hazard, recall_date, last_publish_date',
    )
    .order('recall_number', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRecallRow);
}

export async function dbFetchPrioritizations(supabase) {
  // Single query: join recall to get recall_number without a second round-trip.
  const { data, error } = await supabase
    .from('prioritization')
    .select(
      'prioritization_id, recall_id, priority_rank, prioritized_at, effective_start_at, user_id, recall(recall_number)',
    )
    .order('prioritized_at', { ascending: false });

  if (error) throw new Error(error.message);

  const recallNumberById = new Map(
    (data ?? []).map((row) => [row.recall_id, row.recall?.recall_number ?? String(row.recall_id)]),
  );

  const byRecall = new Map();
  for (const row of data ?? []) {
    if (!byRecall.has(row.recall_id)) {
      byRecall.set(row.recall_id, row);
    }
  }

  return Array.from(byRecall.values()).map((row) =>
    mapPrioritizationRow(row, recallNumberById),
  );
}

export async function dbResolveAppUserId(supabase, email, appUserId) {
  if (appUserId) {
    const { data, error } = await supabase
      .from('user')
      .select('user_id')
      .eq('user_id', appUserId)
      .maybeSingle();
    if (!error && data?.user_id != null) return data.user_id;
  }
  if (!email) return null;
  const { data, error } = await supabase
    .from('user')
    .select('user_id')
    .eq('username', email)
    .maybeSingle();
  if (error) {
    console.warn('dbResolveAppUserId:', error.message);
    return null;
  }
  return data?.user_id ?? null;
}

export async function dbUpsertPrioritization(supabase, recallNumber, priorityLabel, appUserId) {
  const rank = rankFromPriorityLabel(priorityLabel);
  if (!rank) {
    return { success: false, error: 'Invalid priority' };
  }

  const { data: recallRow, error: findErr } = await supabase
    .from('recall')
    .select('recall_id')
    .eq('recall_number', recallNumber.trim())
    .maybeSingle();

  if (findErr) return { success: false, error: findErr.message };
  if (!recallRow) return { success: false, error: 'Recall ID does not exist' };

  const recallPk = recallRow.recall_id;

  if (appUserId == null) {
    return {
      success: false,
      error:
        'No application user linked to this login. Add a row in public.user with username equal to your sign-in email.',
    };
  }

  const { data: existing, error: exErr } = await supabase
    .from('prioritization')
    .select('prioritization_id')
    .eq('recall_id', recallPk)
    .order('prioritized_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (exErr) return { success: false, error: exErr.message };

  const now = new Date().toISOString();

  if (existing?.prioritization_id != null) {
    const { data: updated, error: upErr } = await supabase
      .from('prioritization')
      .update({
        priority_rank: rank,
        prioritized_at: now,
        user_id: appUserId,
      })
      .eq('prioritization_id', existing.prioritization_id)
      .select(
        'prioritization_id, recall_id, priority_rank, prioritized_at, effective_start_at, user_id',
      )
      .single();

    if (upErr) return { success: false, error: upErr.message };
    const recallNumberById = new Map([[recallPk, recallNumber.trim()]]);
    return {
      success: true,
      data: mapPrioritizationRow(updated, recallNumberById),
    };
  }

  const { data: inserted, error: insErr } = await supabase
    .from('prioritization')
    .insert({
      recall_id: recallPk,
      priority_rank: rank,
      prioritized_at: now,
      user_id: appUserId,
    })
    .select(
      'prioritization_id, recall_id, priority_rank, prioritized_at, effective_start_at, user_id',
    )
    .single();

  if (insErr) return { success: false, error: insErr.message };

  const recallNumberById = new Map([[recallPk, recallNumber.trim()]]);
  return {
    success: true,
    data: mapPrioritizationRow(inserted, recallNumberById),
  };
}
