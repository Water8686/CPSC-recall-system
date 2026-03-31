/**
 * DB helpers for the investigation workflow:
 * listing → violation → violation_response → adjudication
 */

// ─── Listings ────────────────────────────────────────────────────────────────

export async function dbFetchListings(supabase, { recallId } = {}) {
  let q = supabase
    .from('listing')
    .select(
      `listing_id, recall_id, url, marketplace, title, price, description,
       added_by, added_at, is_true_match, annotation_notes, annotated_by, annotated_at,
       recall(recall_number, recall_title, product_name),
       adder:app_users!listing_added_by_fkey(id, full_name, email),
       annotator:app_users!listing_annotated_by_fkey(id, full_name, email)`
    )
    .order('added_at', { ascending: false });

  if (recallId) q = q.eq('recall_id', recallId);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(mapListingRow);
}

export async function dbCreateListing(supabase, fields) {
  const { data, error } = await supabase
    .from('listing')
    .insert({
      recall_id:   fields.recall_id,
      url:         fields.url,
      marketplace: fields.marketplace ?? 'Unknown',
      title:       fields.title ?? null,
      price:       fields.price ?? null,
      description: fields.description ?? null,
      added_by:    fields.added_by ?? null,
      added_at:    new Date().toISOString(),
    })
    .select(
      `listing_id, recall_id, url, marketplace, title, price, description,
       added_by, added_at, is_true_match, annotation_notes, annotated_by, annotated_at,
       recall(recall_number, recall_title, product_name),
       adder:app_users!listing_added_by_fkey(id, full_name, email),
       annotator:app_users!listing_annotated_by_fkey(id, full_name, email)`
    )
    .single();
  if (error) throw error;
  return mapListingRow(data);
}

export async function dbAnnotateListing(supabase, listingId, { is_true_match, annotation_notes, annotated_by }) {
  const { data, error } = await supabase
    .from('listing')
    .update({
      is_true_match,
      annotation_notes: annotation_notes ?? null,
      annotated_by:     annotated_by ?? null,
      annotated_at:     new Date().toISOString(),
    })
    .eq('listing_id', listingId)
    .select(
      `listing_id, recall_id, url, marketplace, title, price, description,
       added_by, added_at, is_true_match, annotation_notes, annotated_by, annotated_at,
       recall(recall_number, recall_title, product_name),
       adder:app_users!listing_added_by_fkey(id, full_name, email),
       annotator:app_users!listing_annotated_by_fkey(id, full_name, email)`
    )
    .single();
  if (error) throw error;
  return mapListingRow(data);
}

function mapListingRow(row) {
  if (!row) return null;
  return {
    listing_id:       row.listing_id,
    recall_id:        row.recall_id,
    recall_number:    row.recall?.recall_number ?? null,
    recall_title:     row.recall?.recall_title ?? row.recall?.product_name ?? null,
    url:              row.url,
    marketplace:      row.marketplace,
    title:            row.title ?? null,
    price:            row.price != null ? Number(row.price) : null,
    description:      row.description ?? null,
    added_by:         row.added_by ?? null,
    added_by_name:    row.adder?.full_name ?? row.adder?.email ?? null,
    added_at:         row.added_at,
    is_true_match:    row.is_true_match ?? null,
    annotation_notes: row.annotation_notes ?? null,
    annotated_by:     row.annotated_by ?? null,
    annotated_by_name: row.annotator?.full_name ?? row.annotator?.email ?? null,
    annotated_at:     row.annotated_at ?? null,
  };
}

// ─── Violations ──────────────────────────────────────────────────────────────

export async function dbFetchViolations(supabase, { investigatorId, status } = {}) {
  let q = supabase
    .from('violation')
    .select(
      `violation_id, listing_id, recall_id, investigator_id,
       violation_noticed_at, violation_status, notice_sent_at, notice_contact, notes,
       recall(recall_number, recall_title, product_name),
       investigator:app_users!violation_investigator_id_fkey(id, full_name, email),
       listing(url, marketplace, title, is_true_match),
       violation_response(response_id, responded_at, action_taken, response_text),
       adjudication(adjudication_id, status, reason, adjudicated_at)`
    )
    .order('violation_noticed_at', { ascending: false });

  if (investigatorId) q = q.eq('investigator_id', investigatorId);
  if (status) q = q.eq('violation_status', status);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(mapViolationRow);
}

export async function dbCreateViolation(supabase, fields) {
  const { data, error } = await supabase
    .from('violation')
    .insert({
      listing_id:           fields.listing_id ?? null,
      recall_id:            fields.recall_id,
      investigator_id:      fields.investigator_id ?? null,
      violation_noticed_at: new Date().toISOString(),
      violation_status:     'Open',
      notes:                fields.notes ?? null,
    })
    .select(
      `violation_id, listing_id, recall_id, investigator_id,
       violation_noticed_at, violation_status, notice_sent_at, notice_contact, notes,
       recall(recall_number, recall_title, product_name),
       investigator:app_users!violation_investigator_id_fkey(id, full_name, email),
       listing(url, marketplace, title, is_true_match),
       violation_response(response_id, responded_at, action_taken, response_text),
       adjudication(adjudication_id, status, reason, adjudicated_at)`
    )
    .single();
  if (error) throw error;
  return mapViolationRow(data);
}

export async function dbUpdateViolationStatus(supabase, violationId, fields) {
  const patch = { violation_status: fields.violation_status };
  if (fields.notice_sent_at !== undefined) patch.notice_sent_at = fields.notice_sent_at;
  if (fields.notice_contact !== undefined) patch.notice_contact = fields.notice_contact;
  if (fields.notes !== undefined) patch.notes = fields.notes;

  const { data, error } = await supabase
    .from('violation')
    .update(patch)
    .eq('violation_id', violationId)
    .select(
      `violation_id, listing_id, recall_id, investigator_id,
       violation_noticed_at, violation_status, notice_sent_at, notice_contact, notes,
       recall(recall_number, recall_title, product_name),
       investigator:app_users!violation_investigator_id_fkey(id, full_name, email),
       listing(url, marketplace, title, is_true_match),
       violation_response(response_id, responded_at, action_taken, response_text),
       adjudication(adjudication_id, status, reason, adjudicated_at)`
    )
    .single();
  if (error) throw error;
  return mapViolationRow(data);
}

function mapViolationRow(row) {
  if (!row) return null;
  const responses = Array.isArray(row.violation_response) ? row.violation_response : [];
  const adjudications = Array.isArray(row.adjudication) ? row.adjudication : [];
  return {
    violation_id:         row.violation_id,
    listing_id:           row.listing_id ?? null,
    recall_id:            row.recall_id,
    recall_number:        row.recall?.recall_number ?? null,
    recall_title:         row.recall?.recall_title ?? row.recall?.product_name ?? null,
    investigator_id:      row.investigator_id ?? null,
    investigator_name:    row.investigator?.full_name ?? row.investigator?.email ?? null,
    violation_noticed_at: row.violation_noticed_at,
    violation_status:     row.violation_status,
    notice_sent_at:       row.notice_sent_at ?? null,
    notice_contact:       row.notice_contact ?? null,
    notes:                row.notes ?? null,
    listing_url:          row.listing?.url ?? null,
    listing_marketplace:  row.listing?.marketplace ?? null,
    listing_title:        row.listing?.title ?? null,
    response_count:       responses.length,
    latest_response:      responses[0] ?? null,
    adjudication:         adjudications[0] ?? null,
  };
}

// ─── Responses ───────────────────────────────────────────────────────────────

export async function dbFetchResponses(supabase) {
  const { data, error } = await supabase
    .from('violation_response')
    .select(
      `response_id, violation_id, seller_id, responded_at, response_text, action_taken,
       seller:app_users!violation_response_seller_id_fkey(id, full_name, email),
       violation(violation_id, violation_status, recall_id,
         recall(recall_number, recall_title, product_name),
         listing(url, marketplace, title))`
    )
    .order('responded_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapResponseRow);
}

export async function dbCreateResponse(supabase, fields) {
  const { data, error } = await supabase
    .from('violation_response')
    .insert({
      violation_id:  fields.violation_id,
      seller_id:     fields.seller_id ?? null,
      responded_at:  new Date().toISOString(),
      response_text: fields.response_text,
      action_taken:  fields.action_taken ?? null,
    })
    .select(
      `response_id, violation_id, seller_id, responded_at, response_text, action_taken,
       seller:app_users!violation_response_seller_id_fkey(id, full_name, email),
       violation(violation_id, violation_status, recall_id,
         recall(recall_number, recall_title, product_name),
         listing(url, marketplace, title))`
    )
    .single();
  if (error) throw error;

  // Auto-advance violation status to "Response Received" if still open/notice sent
  await supabase
    .from('violation')
    .update({ violation_status: 'Response Received' })
    .eq('violation_id', fields.violation_id)
    .in('violation_status', ['Open', 'Notice Sent']);

  return mapResponseRow(data);
}

function mapResponseRow(row) {
  if (!row) return null;
  const v = row.violation;
  return {
    response_id:   row.response_id,
    violation_id:  row.violation_id,
    seller_id:     row.seller_id ?? null,
    seller_name:   row.seller?.full_name ?? row.seller?.email ?? null,
    responded_at:  row.responded_at,
    response_text: row.response_text,
    action_taken:  row.action_taken ?? null,
    recall_id:     v?.recall_id ?? null,
    recall_number: v?.recall?.recall_number ?? null,
    recall_title:  v?.recall?.recall_title ?? v?.recall?.product_name ?? null,
    listing_url:   v?.listing?.url ?? null,
    listing_marketplace: v?.listing?.marketplace ?? null,
  };
}

// ─── Adjudications ───────────────────────────────────────────────────────────

export async function dbFetchAdjudications(supabase) {
  const { data, error } = await supabase
    .from('adjudication')
    .select(
      `adjudication_id, violation_id, investigator_id, adjudicated_at, status, reason, notes,
       investigator:app_users!adjudication_investigator_id_fkey(id, full_name, email),
       violation(violation_id, violation_status, recall_id, investigator_id,
         recall(recall_number, recall_title, product_name),
         listing(url, marketplace, title),
         violation_response(response_id, responded_at, action_taken))`
    )
    .order('adjudicated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapAdjudicationRow);
}

export async function dbCreateAdjudication(supabase, fields) {
  const { data, error } = await supabase
    .from('adjudication')
    .insert({
      violation_id:    fields.violation_id,
      investigator_id: fields.investigator_id ?? null,
      adjudicated_at:  new Date().toISOString(),
      status:          fields.status,
      reason:          fields.reason ?? null,
      notes:           fields.notes ?? null,
    })
    .select(
      `adjudication_id, violation_id, investigator_id, adjudicated_at, status, reason, notes,
       investigator:app_users!adjudication_investigator_id_fkey(id, full_name, email),
       violation(violation_id, violation_status, recall_id, investigator_id,
         recall(recall_number, recall_title, product_name),
         listing(url, marketplace, title),
         violation_response(response_id, responded_at, action_taken))`
    )
    .single();
  if (error) throw error;

  // Close the violation after adjudication
  await supabase
    .from('violation')
    .update({ violation_status: 'Closed' })
    .eq('violation_id', fields.violation_id);

  return mapAdjudicationRow(data);
}

function mapAdjudicationRow(row) {
  if (!row) return null;
  const v = row.violation;
  const responses = Array.isArray(v?.violation_response) ? v.violation_response : [];
  return {
    adjudication_id:    row.adjudication_id,
    violation_id:       row.violation_id,
    investigator_id:    row.investigator_id ?? null,
    investigator_name:  row.investigator?.full_name ?? row.investigator?.email ?? null,
    adjudicated_at:     row.adjudicated_at,
    status:             row.status,
    reason:             row.reason ?? null,
    notes:              row.notes ?? null,
    recall_id:          v?.recall_id ?? null,
    recall_number:      v?.recall?.recall_number ?? null,
    recall_title:       v?.recall?.recall_title ?? v?.recall?.product_name ?? null,
    listing_url:        v?.listing?.url ?? null,
    listing_marketplace: v?.listing?.marketplace ?? null,
    response_count:     responses.length,
    latest_action:      responses[0]?.action_taken ?? null,
  };
}
