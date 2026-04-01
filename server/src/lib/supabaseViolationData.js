/**
 * DB helpers for the investigation workflow:
 * listing → violation → contact → response → adjudication
 *
 * Actual DB schema (public schema, CSPC Team 6 Database):
 *   listing:      listing_id, marketplace_id (FK), seller_id (FK, nullable), listing_url,
 *                 listing_title, listing_description, listing_posted_at, ...
 *   violation:    violation_id, listing_id (FK), recall_id (FK), user_id (FK → app_users),
 *                 investigator_commentary, violation_status, violation_noticed_at
 *   contact:      contact_id, violation_id (FK), user_id (FK), contacted_party_type,
 *                 seller_id, marketplace_id, contact_channel, message_summary, contact_sent_at
 *   response:     response_id, contact_id (FK), user_id (FK), responder_type, seller_id,
 *                 marketplace_id, response_text, response_action, response_received_at
 *   adjudication: adjudication_id, response_id (FK), user_id (FK), outcome,
 *                 resolution_reason, adjudication_notes, adjudicated_at
 */

// ─── Listings ────────────────────────────────────────────────────────────────

const LISTING_SELECT = `
  listing_id, marketplace_id, seller_id, external_listing_id,
  listing_url, listing_title, listing_description, listing_posted_at,
  listing_snapshot_url, snapshot_captured_at,
  marketplace(marketplace_name),
  seller(seller_name, seller_email)
`;

export async function dbFetchListings(supabase, { recallId } = {}) {
  let listingIds = null;

  if (recallId) {
    // listing has no recall_id column — filter via the violation join
    const { data: vData, error: vErr } = await supabase
      .from('violation')
      .select('listing_id')
      .eq('recall_id', recallId)
      .not('listing_id', 'is', null);
    if (vErr) throw vErr;
    listingIds = (vData ?? []).map((v) => v.listing_id).filter(Boolean);
    if (listingIds.length === 0) return [];
  }

  let q = supabase
    .from('listing')
    .select(LISTING_SELECT)
    .order('listing_posted_at', { ascending: false });

  if (listingIds !== null) {
    q = q.in('listing_id', listingIds);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(mapListingRow);
}

export async function dbCreateListing(supabase, fields) {
  // Resolve marketplace_id from name string
  let marketplace_id = null;
  const mktName = fields.marketplace ? String(fields.marketplace).trim() : null;

  if (mktName) {
    const { data: mkt } = await supabase
      .from('marketplace')
      .select('marketplace_id')
      .ilike('marketplace_name', mktName)
      .maybeSingle();

    if (mkt) {
      marketplace_id = mkt.marketplace_id;
    } else {
      // Create new marketplace entry
      const { data: newMkt, error: mktErr } = await supabase
        .from('marketplace')
        .insert({ marketplace_name: mktName })
        .select('marketplace_id')
        .single();
      if (mktErr) throw mktErr;
      marketplace_id = newMkt.marketplace_id;
    }
  } else {
    const { data: firstMkt } = await supabase
      .from('marketplace')
      .select('marketplace_id')
      .limit(1)
      .maybeSingle();
    marketplace_id = firstMkt?.marketplace_id ?? null;
    if (!marketplace_id) throw new Error('No marketplace available; provide a marketplace name');
  }

  const { data, error } = await supabase
    .from('listing')
    .insert({
      marketplace_id,
      seller_id:           fields.seller_id ?? null,
      listing_url:         fields.url ?? null,
      listing_title:       fields.title ?? null,
      listing_description: fields.description ?? null,
      listing_posted_at:   new Date().toISOString(),
    })
    .select(LISTING_SELECT)
    .single();
  if (error) throw error;
  return mapListingRow(data);
}

export async function dbAnnotateListing(supabase, listingId, _fields) {
  // is_true_match / annotation columns do not exist in the current DB schema.
  // Return the listing unchanged so the frontend continues to function.
  const { data, error } = await supabase
    .from('listing')
    .select(LISTING_SELECT)
    .eq('listing_id', listingId)
    .maybeSingle();
  if (error) throw error;
  return mapListingRow(data);
}

function mapListingRow(row) {
  if (!row) return null;
  return {
    listing_id:          row.listing_id,
    marketplace_id:      row.marketplace_id,
    seller_id:           row.seller_id ?? null,
    external_listing_id: row.external_listing_id ?? null,
    url:                 row.listing_url ?? null,
    title:               row.listing_title ?? null,
    description:         row.listing_description ?? null,
    marketplace:         row.marketplace?.marketplace_name ?? null,
    seller_name:         row.seller?.seller_name ?? null,
    listed_at:           row.listing_posted_at ?? null,
    snapshot_url:        row.listing_snapshot_url ?? null,
    // annotation stubs — not in current DB schema
    is_true_match:       null,
    annotation_notes:    null,
    annotated_by:        null,
    annotated_at:        null,
  };
}

// ─── Violations ──────────────────────────────────────────────────────────────

const VIOLATION_SELECT = `
  violation_id, listing_id, recall_id, user_id,
  investigator_commentary, violation_status, violation_noticed_at,
  recall(recall_number, recall_title, product_name),
  investigator:app_users!violation_user_id_fkey(user_id, full_name, email),
  listing(listing_url, listing_title, marketplace_id, marketplace(marketplace_name)),
  contact(contact_id, contact_sent_at, message_summary,
    response(response_id, response_received_at, response_action, response_text,
      adjudication(adjudication_id, outcome, resolution_reason, adjudicated_at)))
`;

export async function dbFetchViolations(supabase, { investigatorId, status } = {}) {
  let q = supabase
    .from('violation')
    .select(VIOLATION_SELECT)
    .order('violation_noticed_at', { ascending: false });

  if (investigatorId) q = q.eq('user_id', investigatorId);
  if (status) q = q.eq('violation_status', status);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(mapViolationRow);
}

export async function dbCreateViolation(supabase, fields) {
  const { data, error } = await supabase
    .from('violation')
    .insert({
      listing_id:              fields.listing_id ?? null,
      recall_id:               fields.recall_id,
      user_id:                 fields.investigator_id ?? null,
      investigator_commentary: fields.notes ?? null,
      violation_noticed_at:    new Date().toISOString(),
      violation_status:        'Open',
    })
    .select(VIOLATION_SELECT)
    .single();
  if (error) throw error;
  return mapViolationRow(data);
}

export async function dbUpdateViolationStatus(supabase, violationId, fields) {
  const patch = {};
  if (fields.violation_status !== undefined) patch.violation_status = fields.violation_status;
  if (fields.notes !== undefined) patch.investigator_commentary = fields.notes;

  const { data, error } = await supabase
    .from('violation')
    .update(patch)
    .eq('violation_id', violationId)
    .select(VIOLATION_SELECT)
    .single();
  if (error) throw error;
  return mapViolationRow(data);
}

function mapViolationRow(row) {
  if (!row) return null;
  const contacts = Array.isArray(row.contact) ? row.contact : [];
  const responses = contacts.flatMap((c) => (Array.isArray(c.response) ? c.response : []));
  const adjudications = responses.flatMap((r) =>
    Array.isArray(r.adjudication) ? r.adjudication : [],
  );
  const latestContact = contacts[0] ?? null;
  const latestResponse = responses[0] ?? null;
  const latestAdj = adjudications[0] ?? null;

  return {
    violation_id:         row.violation_id,
    listing_id:           row.listing_id ?? null,
    recall_id:            row.recall_id,
    recall_number:        row.recall?.recall_number ?? null,
    recall_title:         row.recall?.recall_title ?? row.recall?.product_name ?? null,
    investigator_id:      row.user_id ?? null,
    investigator_name:    row.investigator?.full_name ?? row.investigator?.email ?? null,
    violation_noticed_at: row.violation_noticed_at,
    violation_status:     row.violation_status,
    notes:                row.investigator_commentary ?? null,
    // notice info derived from contact records
    notice_sent_at:       latestContact?.contact_sent_at ?? null,
    notice_contact:       latestContact?.message_summary ?? null,
    listing_url:          row.listing?.listing_url ?? null,
    listing_marketplace:  row.listing?.marketplace?.marketplace_name ?? null,
    listing_title:        row.listing?.listing_title ?? null,
    response_count:       responses.length,
    latest_response:      latestResponse
      ? {
          response_id:   latestResponse.response_id,
          responded_at:  latestResponse.response_received_at,
          action_taken:  latestResponse.response_action,
          response_text: latestResponse.response_text,
        }
      : null,
    adjudication: latestAdj
      ? {
          adjudication_id: latestAdj.adjudication_id,
          status:          latestAdj.outcome,
          reason:          latestAdj.resolution_reason,
          adjudicated_at:  latestAdj.adjudicated_at,
        }
      : null,
  };
}

// ─── Responses ───────────────────────────────────────────────────────────────

const RESPONSE_SELECT = `
  response_id, contact_id, user_id, responder_type, seller_id, marketplace_id,
  response_text, response_action, response_received_at,
  seller:seller!response_seller_id_fkey(seller_name, seller_email),
  contact(contact_id, violation_id,
    violation(violation_id, violation_status, recall_id,
      recall(recall_number, recall_title, product_name),
      listing(listing_url, listing_title, marketplace(marketplace_name))))
`;

export async function dbFetchResponses(supabase) {
  const { data, error } = await supabase
    .from('response')
    .select(RESPONSE_SELECT)
    .order('response_received_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapResponseRow);
}

export async function dbCreateResponse(supabase, fields) {
  const violationId = fields.violation_id;

  // Responses link to contacts; find or create a contact for this violation
  const { data: existingContact } = await supabase
    .from('contact')
    .select('contact_id')
    .eq('violation_id', violationId)
    .order('contact_sent_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let contactId;
  if (existingContact?.contact_id) {
    contactId = existingContact.contact_id;
  } else {
    const { data: newContact, error: contactErr } = await supabase
      .from('contact')
      .insert({
        violation_id:         violationId,
        user_id:              fields.user_id,
        contacted_party_type: 'seller',
        contact_sent_at:      new Date().toISOString(),
      })
      .select('contact_id')
      .single();
    if (contactErr) throw contactErr;
    contactId = newContact.contact_id;
  }

  const { data, error } = await supabase
    .from('response')
    .insert({
      contact_id:           contactId,
      user_id:              fields.user_id ?? null,
      responder_type:       'seller',
      seller_id:            null,
      response_text:        fields.response_text,
      response_action:      fields.action_taken ?? null,
      response_received_at: new Date().toISOString(),
    })
    .select(RESPONSE_SELECT)
    .single();
  if (error) throw error;

  // Auto-advance violation status to "Response Received" if still open
  await supabase
    .from('violation')
    .update({ violation_status: 'Response Received' })
    .eq('violation_id', violationId)
    .in('violation_status', ['Open', 'Notice Sent']);

  return mapResponseRow(data);
}

function mapResponseRow(row) {
  if (!row) return null;
  const v = row.contact?.violation;
  return {
    response_id:         row.response_id,
    contact_id:          row.contact_id,
    violation_id:        row.contact?.violation_id ?? null,
    seller_id:           row.seller_id ?? null,
    seller_name:         row.seller?.seller_name ?? null,
    responded_at:        row.response_received_at,
    response_text:       row.response_text,
    action_taken:        row.response_action ?? null,
    recall_id:           v?.recall_id ?? null,
    recall_number:       v?.recall?.recall_number ?? null,
    recall_title:        v?.recall?.recall_title ?? v?.recall?.product_name ?? null,
    listing_url:         v?.listing?.listing_url ?? null,
    listing_marketplace: v?.listing?.marketplace?.marketplace_name ?? null,
  };
}

// ─── Adjudications ───────────────────────────────────────────────────────────

const ADJUDICATION_SELECT = `
  adjudication_id, response_id, user_id, outcome, resolution_reason,
  adjudication_notes, adjudicated_at,
  investigator:app_users!adjudication_user_id_fkey(user_id, full_name, email),
  response(response_id, response_action, contact_id,
    contact(contact_id, violation_id,
      violation(violation_id, violation_status, recall_id,
        recall(recall_number, recall_title, product_name),
        listing(listing_url, listing_title, marketplace(marketplace_name)))))
`;

export async function dbFetchAdjudications(supabase) {
  const { data, error } = await supabase
    .from('adjudication')
    .select(ADJUDICATION_SELECT)
    .order('adjudicated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapAdjudicationRow);
}

export async function dbCreateAdjudication(supabase, fields) {
  const violationId = fields.violation_id;

  // Adjudications link to responses; find the latest response for the violation
  const { data: contacts } = await supabase
    .from('contact')
    .select('contact_id')
    .eq('violation_id', violationId)
    .order('contact_sent_at', { ascending: false });

  let responseId = null;
  if (contacts && contacts.length > 0) {
    const contactIds = contacts.map((c) => c.contact_id);
    const { data: latestResponse } = await supabase
      .from('response')
      .select('response_id')
      .in('contact_id', contactIds)
      .order('response_received_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    responseId = latestResponse?.response_id ?? null;
  }

  if (!responseId) {
    throw new Error('No response found for this violation. Record a response before adjudicating.');
  }

  const { data, error } = await supabase
    .from('adjudication')
    .insert({
      response_id:        responseId,
      user_id:            fields.investigator_id ?? null,
      outcome:            fields.status,
      resolution_reason:  fields.reason ?? null,
      adjudication_notes: fields.notes ?? null,
      adjudicated_at:     new Date().toISOString(),
    })
    .select(ADJUDICATION_SELECT)
    .single();
  if (error) throw error;

  // Close the violation after adjudication
  await supabase
    .from('violation')
    .update({ violation_status: 'Closed' })
    .eq('violation_id', violationId);

  return mapAdjudicationRow(data);
}

function mapAdjudicationRow(row) {
  if (!row) return null;
  const v = row.response?.contact?.violation;
  return {
    adjudication_id:     row.adjudication_id,
    violation_id:        row.response?.contact?.violation_id ?? null,
    investigator_id:     row.user_id ?? null,
    investigator_name:   row.investigator?.full_name ?? row.investigator?.email ?? null,
    adjudicated_at:      row.adjudicated_at,
    status:              row.outcome,
    reason:              row.resolution_reason ?? null,
    notes:               row.adjudication_notes ?? null,
    recall_id:           v?.recall_id ?? null,
    recall_number:       v?.recall?.recall_number ?? null,
    recall_title:        v?.recall?.recall_title ?? v?.recall?.product_name ?? null,
    listing_url:         v?.listing?.listing_url ?? null,
    listing_marketplace: v?.listing?.marketplace?.marketplace_name ?? null,
    response_count:      1,
    latest_action:       row.response?.response_action ?? null,
  };
}
