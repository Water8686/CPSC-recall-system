import { SPRINT3_VIOLATION_STATUS } from 'shared';

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
  listing_snapshot_url, snapshot_captured_at, source, recall_id,
  is_true_match, annotation_notes, annotated_by, annotated_at,
  marketplace(marketplace_name),
  seller(seller_name, seller_email)
`;

export async function dbFetchListings(supabase, { recallId } = {}) {
  let q = supabase
    .from('listing')
    .select(LISTING_SELECT)
    .order('listing_posted_at', { ascending: false });

  if (recallId) {
    q = q.eq('recall_id', recallId);
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
      listing_posted_at:   fields.listed_at ?? new Date().toISOString(),
      recall_id:           fields.recall_id ?? null,
      source:              fields.source ?? 'Manual',
    })
    .select(LISTING_SELECT)
    .single();
  if (error) throw error;
  return mapListingRow(data);
}

export async function dbAnnotateListing(supabase, listingId, fields) {
  const patch = {
    is_true_match: Boolean(fields.is_true_match),
    annotation_notes: fields.annotation_notes != null ? String(fields.annotation_notes).trim() || null : null,
    annotated_by: fields.annotated_by ?? null,
    annotated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('listing')
    .update(patch)
    .eq('listing_id', listingId)
    .select(LISTING_SELECT)
    .single();
  if (error) throw error;
  if (!data) throw new Error('Listing not found');
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
    source:              row.source ?? 'Manual',
    recall_id:           row.recall_id ?? null,
    snapshot_url:        row.listing_snapshot_url ?? null,
    is_true_match:       row.is_true_match ?? null,
    annotation_notes:    row.annotation_notes ?? null,
    annotated_by:        row.annotated_by ?? null,
    annotated_at:        row.annotated_at ?? null,
  };
}

// ─── Violations ──────────────────────────────────────────────────────────────

const VIOLATION_SELECT = `
  violation_id, listing_id, recall_id, user_id,
  investigator_commentary, violation_status, violation_noticed_at,
  violation_type, date_of_violation, notice_sent_at,
  recall(recall_number, recall_title, product_name),
  investigator:app_users!violation_user_id_fkey(user_id, full_name, email),
  listing(listing_url, listing_title, marketplace_id,
    marketplace(marketplace_name),
    seller(seller_name, seller_email)),
  contact(contact_id, contact_sent_at, message_summary,
    response(response_id, response_received_at, response_action, response_text,
      adjudication(adjudication_id, outcome, resolution_reason, adjudicated_at)))
`;

export async function dbFetchViolations(
  supabase,
  { investigatorId, includeUnassigned = false, status } = {},
) {
  let q = supabase
    .from('violation')
    .select(VIOLATION_SELECT)
    .order('violation_noticed_at', { ascending: false });

  if (investigatorId && includeUnassigned) {
    q = q.or(`user_id.eq.${investigatorId},user_id.is.null`);
  } else if (investigatorId) {
    q = q.eq('user_id', investigatorId);
  }
  if (status) q = q.eq('violation_status', status);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(mapViolationRow);
}

const VIOLATION_DETAIL_BASE = `
  violation_id, listing_id, recall_id, user_id,
  investigator_commentary, violation_status, violation_noticed_at,
  violation_type, date_of_violation, notice_sent_at,
  recall(recall_number, recall_title, product_name),
  investigator:app_users!violation_user_id_fkey(user_id, full_name, email),
  listing(listing_url, listing_title, marketplace_id,
    marketplace(marketplace_name),
    seller(seller_name, seller_email))
`;

function sortByTimeAsc(rows, key) {
  return [...(rows ?? [])].sort((a, b) => {
    const ta = a?.[key] ? new Date(a[key]).getTime() : 0;
    const tb = b?.[key] ? new Date(b[key]).getTime() : 0;
    return ta - tb;
  });
}

function mapAdjudicationDetail(adj) {
  if (adj == null) return null;
  const row = Array.isArray(adj) ? adj[0] : adj;
  if (!row) return null;
  return {
    adjudication_id: row.adjudication_id,
    status: row.outcome,
    reason: row.resolution_reason ?? null,
    notes: row.adjudication_notes ?? null,
    adjudicated_at: row.adjudicated_at ?? null,
  };
}

function mapResponseDetail(row) {
  if (!row) return null;
  return {
    response_id: row.response_id,
    contact_id: row.contact_id,
    user_id: row.user_id ?? null,
    responder_type: row.responder_type ?? null,
    response_text: row.response_text ?? null,
    action_taken: row.response_action ?? null,
    responded_at: row.response_received_at ?? null,
    adjudication: mapAdjudicationDetail(row.adjudication),
  };
}

function mapContactDetail(row) {
  if (!row) return null;
  const rawResponses = Array.isArray(row.response) ? row.response : row.response ? [row.response] : [];
  const responses = sortByTimeAsc(rawResponses, 'response_received_at').map(mapResponseDetail).filter(Boolean);
  return {
    contact_id: row.contact_id,
    violation_id: row.violation_id,
    user_id: row.user_id ?? null,
    contacted_party_type: row.contacted_party_type ?? null,
    contact_channel: row.contact_channel ?? null,
    message_summary: row.message_summary ?? null,
    contact_sent_at: row.contact_sent_at ?? null,
    responses,
  };
}

/**
 * Full violation record: list-shaped summary fields plus ordered contacts → responses → adjudication.
 */
export async function dbFetchViolationDetail(supabase, violationId) {
  const { data: vRow, error: vErr } = await supabase
    .from('violation')
    .select(VIOLATION_DETAIL_BASE)
    .eq('violation_id', violationId)
    .maybeSingle();

  if (vErr) throw vErr;
  if (!vRow) return null;

  const { data: contactRows, error: cErr } = await supabase
    .from('contact')
    .select(
      `
      contact_id, violation_id, user_id, contacted_party_type, contact_channel, message_summary, contact_sent_at,
      response (
        response_id, contact_id, user_id, responder_type, response_text, response_action, response_received_at,
        adjudication (
          adjudication_id, response_id, user_id, outcome, resolution_reason, adjudication_notes, adjudicated_at
        )
      )
    `,
    )
    .eq('violation_id', violationId)
    .order('contact_sent_at', { ascending: true });

  if (cErr) throw cErr;

  const contacts = (contactRows ?? []).map(mapContactDetail).filter(Boolean);

  const base = mapViolationRow({ ...vRow, contact: [] });
  const allResponses = contacts.flatMap((c) => c.responses ?? []);
  const latestResponse = allResponses.reduce((best, r) => {
    if (!r?.responded_at) return best;
    if (!best || new Date(r.responded_at) > new Date(best.responded_at)) return r;
    return best;
  }, null);
  const latestAdj = latestResponse?.adjudication ?? null;
  const latestContact = [...contacts].sort((a, b) => {
    const ta = a.contact_sent_at ? new Date(a.contact_sent_at).getTime() : 0;
    const tb = b.contact_sent_at ? new Date(b.contact_sent_at).getTime() : 0;
    return tb - ta;
  })[0] ?? null;

  const summary = {
    ...base,
    notice_sent_at: vRow.notice_sent_at ?? latestContact?.contact_sent_at ?? base.notice_sent_at,
    notice_contact: latestContact?.message_summary ?? base.notice_contact,
    response_count: allResponses.length,
    latest_response: latestResponse
      ? {
          response_id: latestResponse.response_id,
          responded_at: latestResponse.responded_at,
          action_taken: latestResponse.action_taken,
          response_text: latestResponse.response_text,
        }
      : null,
    adjudication: latestAdj
      ? {
          adjudication_id: latestAdj.adjudication_id,
          status: latestAdj.status,
          reason: latestAdj.reason,
          adjudicated_at: latestAdj.adjudicated_at,
        }
      : null,
  };

  return {
    ...summary,
    contacts,
  };
}

/** Minimal row for auth checks — returns violation owner (user_id) and listing seller (seller_id). */
export async function dbFetchViolationAuthMeta(supabase, violationId) {
  const { data, error } = await supabase
    .from('violation')
    .select('violation_id, user_id, listing(seller_id)')
    .eq('violation_id', violationId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    violation_id: data.violation_id,
    user_id: data.user_id,
    seller_id: data.listing?.seller_id ?? null,
  };
}

/**
 * Resolve the marketplace seller_id for an app_users row.
 * Prefers the explicit seller_id column; falls back to matching email against seller.seller_email.
 */
export async function resolveSellerIdForAppUser(supabase, appUserId) {
  const { data: userRow } = await supabase
    .from('app_users')
    .select('seller_id, email')
    .eq('user_id', appUserId)
    .maybeSingle();

  if (!userRow) return null;
  if (userRow.seller_id != null) return userRow.seller_id;
  if (!userRow.email) return null;

  const { data: sellerRow } = await supabase
    .from('seller')
    .select('seller_id')
    .ilike('seller_email', userRow.email)
    .maybeSingle();

  return sellerRow?.seller_id ?? null;
}

/** Fetch violations whose listing belongs to the given seller. */
export async function dbFetchViolationsForSeller(supabase, sellerId) {
  const { data: listings } = await supabase
    .from('listing')
    .select('listing_id')
    .eq('seller_id', sellerId);

  const listingIds = (listings ?? []).map((l) => l.listing_id);
  if (listingIds.length === 0) return [];

  const { data, error } = await supabase
    .from('violation')
    .select(VIOLATION_SELECT)
    .in('listing_id', listingIds)
    .order('violation_noticed_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapViolationRow);
}

export async function dbFetchViolationWorkflowMeta(supabase, violationId) {
  const { data, error } = await supabase
    .from('violation')
    .select(
      `
      violation_id,
      violation_status,
      listing:listing_id(
        seller_id,
        seller(seller_email)
      )
    `,
    )
    .eq('violation_id', violationId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function dbHasResponseForViolation(supabase, violationId) {
  const { data, error } = await supabase
    .from('response')
    .select('response_id, contact!inner(violation_id)')
    .eq('contact.violation_id', violationId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data?.response_id);
}

export async function dbHasAdjudicationForViolation(supabase, violationId) {
  const { data, error } = await supabase
    .from('adjudication')
    .select('adjudication_id, response!inner(contact!inner(violation_id))')
    .eq('response.contact.violation_id', violationId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data?.adjudication_id);
}

export async function dbCreateViolation(supabase, fields) {
  const VALID_TYPES = [
    'Recalled Product Listed for Sale',
    'Failure to Notify Consumers',
    'Banned Hazardous Substance',
    'Misbranded or Mislabeled Product',
    'Failure to Report',
    'Counterfeit Safety Certification',
  ];

  // Server-side validation
  if (!fields.listing_id) throw new Error('listing_id is required');
  if (!fields.violation_type || !VALID_TYPES.includes(fields.violation_type)) {
    throw new Error('violation_type must be one of: ' + VALID_TYPES.join(', '));
  }
  if (!fields.date_of_violation) throw new Error('date_of_violation is required');
  const dov = new Date(fields.date_of_violation);
  if (isNaN(dov.getTime())) throw new Error('date_of_violation is not a valid date');
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (dov > today) throw new Error('Date of Violation cannot be in the future');

  // Verify listing exists
  const { data: listing, error: listingErr } = await supabase
    .from('listing')
    .select('listing_id')
    .eq('listing_id', fields.listing_id)
    .maybeSingle();
  if (listingErr) throw listingErr;
  if (!listing) throw new Error('Selected listing does not exist');

  // Resolve recall_id from listing if not provided
  let recallId = fields.recall_id;
  if (!recallId) {
    const { data: listingData } = await supabase
      .from('listing')
      .select('recall_id')
      .eq('listing_id', fields.listing_id)
      .maybeSingle();
    recallId = listingData?.recall_id ?? null;
  }

  // Check if violation already exists for this listing (upsert)
  const { data: existing } = await supabase
    .from('violation')
    .select('violation_id')
    .eq('listing_id', fields.listing_id)
    .maybeSingle();

  if (existing) {
    // Update existing violation
    const { data, error } = await supabase
      .from('violation')
      .update({
        violation_type:          fields.violation_type,
        date_of_violation:       fields.date_of_violation,
        investigator_commentary: fields.notes ?? null,
        violation_noticed_at:    new Date().toISOString(),
        user_id:                 fields.investigator_id ?? null,
        recall_id:               recallId,
      })
      .eq('violation_id', existing.violation_id)
      .select(VIOLATION_SELECT)
      .single();
    if (error) throw error;
    return { ...mapViolationRow(data), _updated: true };
  }

  // Insert new violation
  const { data, error } = await supabase
    .from('violation')
    .insert({
      listing_id:              fields.listing_id,
      recall_id:               recallId,
      user_id:                 fields.investigator_id ?? null,
      investigator_commentary: fields.notes ?? null,
      violation_noticed_at:    new Date().toISOString(),
      violation_status:        SPRINT3_VIOLATION_STATUS.OPEN,
      violation_type:          fields.violation_type,
      date_of_violation:       fields.date_of_violation,
    })
    .select(VIOLATION_SELECT)
    .single();
  if (error) throw error;
  return { ...mapViolationRow(data), _updated: false };
}

export async function dbUpdateViolationStatus(supabase, violationId, fields) {
  const patch = {};
  if (fields.violation_status !== undefined) patch.violation_status = fields.violation_status;
  if (fields.notes !== undefined) patch.investigator_commentary = fields.notes;
  if (fields.notice_sent_at !== undefined) patch.notice_sent_at = fields.notice_sent_at;

  const { data, error } = await supabase
    .from('violation')
    .update(patch)
    .eq('violation_id', violationId)
    .select(VIOLATION_SELECT)
    .single();
  if (error) throw error;
  return mapViolationRow(data);
}

/**
 * Log seller outreach on the contact table. Optionally mark the violation Notice Sent in the same call.
 */
export async function dbCreateContact(supabase, fields) {
  const violationId = fields.violation_id;
  if (violationId == null || !Number.isFinite(Number(violationId))) {
    throw new Error('violation_id is required');
  }
  const summary = fields.message_summary != null ? String(fields.message_summary).trim() : '';
  if (!summary) throw new Error('message_summary is required');

  const { data: vRow, error: vErr } = await supabase
    .from('violation')
    .select('violation_id')
    .eq('violation_id', violationId)
    .maybeSingle();
  if (vErr) throw vErr;
  if (!vRow) throw new Error('Violation not found');

  const sentAt = fields.contact_sent_at
    ? String(fields.contact_sent_at)
    : new Date().toISOString();

  const { data: contactRow, error: cErr } = await supabase
    .from('contact')
    .insert({
      violation_id: violationId,
      user_id: fields.user_id ?? null,
      contacted_party_type: 'seller',
      contact_channel: fields.contact_channel != null ? String(fields.contact_channel).trim() || null : null,
      message_summary: summary,
      contact_sent_at: sentAt,
    })
    .select(
      'contact_id, violation_id, user_id, contacted_party_type, contact_channel, message_summary, contact_sent_at',
    )
    .single();
  if (cErr) throw cErr;

  if (fields.mark_notice_sent) {
    const noticeAt =
      fields.notice_sent_at != null ? String(fields.notice_sent_at) : sentAt;
    const { error: upErr } = await supabase
      .from('violation')
      .update({
        violation_status: SPRINT3_VIOLATION_STATUS.NOTICE_SENT,
        notice_sent_at: noticeAt,
      })
      .eq('violation_id', violationId);
    if (upErr) throw upErr;
  }

  return mapContactDetail({
    ...contactRow,
    response: [],
  });
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
    violation_type:       row.violation_type ?? null,
    date_of_violation:    row.date_of_violation ?? null,
    notes:                row.investigator_commentary ?? null,
    // notice info — prefer direct column, fall back to contact record
    notice_sent_at:       row.notice_sent_at ?? latestContact?.contact_sent_at ?? null,
    notice_contact:       latestContact?.message_summary ?? null,
    listing_url:          row.listing?.listing_url ?? null,
    listing_marketplace:  row.listing?.marketplace?.marketplace_name ?? null,
    listing_title:        row.listing?.listing_title ?? null,
    seller_name:          row.listing?.seller?.seller_name ?? null,
    seller_email:         row.listing?.seller?.seller_email ?? null,
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

export async function dbFetchResponses(supabase, { violationId, userId } = {}) {
  let q = supabase
    .from('response')
    .select(RESPONSE_SELECT)
    .order('response_received_at', { ascending: false });
  if (violationId != null) q = q.eq('contact.violation_id', violationId);
  if (userId != null) q = q.eq('user_id', userId);
  const { data, error } = await q;
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

  const responderType =
    fields.responder_type && String(fields.responder_type).trim() === 'investigator'
      ? 'investigator'
      : 'seller';

  const { data, error } = await supabase
    .from('response')
    .insert({
      contact_id:           contactId,
      user_id:              fields.user_id ?? null,
      responder_type:       responderType,
      seller_id:            fields.seller_id ?? null,
      response_text:        fields.response_text,
      response_action:      fields.action_taken ?? null,
      response_received_at: new Date().toISOString(),
    })
    .select(RESPONSE_SELECT)
    .single();
  if (error) throw error;

  return mapResponseRow(data);
}

export async function dbCreateSellerResponseAtomic(supabase, fields) {
  const row = await dbCreateResponse(supabase, {
    ...fields,
    responder_type: 'seller',
  });

  const { error: statusErr } = await supabase
    .from('violation')
    .update({ violation_status: SPRINT3_VIOLATION_STATUS.RESPONSE_SUBMITTED })
    .eq('violation_id', fields.violation_id);

  if (statusErr) {
    await supabase.from('response').delete().eq('response_id', row.response_id);
    throw statusErr;
  }

  return row;
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
    seller_email:        row.seller?.seller_email ?? null,
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

export async function dbFetchAdjudications(supabase, { violationId, investigatorId } = {}) {
  let q = supabase
    .from('adjudication')
    .select(ADJUDICATION_SELECT)
    .order('adjudicated_at', { ascending: false });
  if (violationId != null) q = q.eq('response.contact.violation_id', violationId);
  if (investigatorId != null) q = q.eq('user_id', investigatorId);
  const { data, error } = await q;
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

  return mapAdjudicationRow(data);
}

export async function dbCreateAdjudicationAtomic(supabase, fields) {
  const row = await dbCreateAdjudication(supabase, fields);

  const mappedStatus =
    fields.status === 'Approved'
      ? SPRINT3_VIOLATION_STATUS.APPROVED
      : fields.status === 'Rejected'
        ? SPRINT3_VIOLATION_STATUS.REJECTED
        : SPRINT3_VIOLATION_STATUS.ESCALATED;

  const { error: statusErr } = await supabase
    .from('violation')
    .update({ violation_status: mappedStatus })
    .eq('violation_id', fields.violation_id);

  if (statusErr) {
    await supabase.from('adjudication').delete().eq('adjudication_id', row.adjudication_id);
    throw statusErr;
  }

  if (fields.status === 'Escalated') {
    const { error: escErr } = await supabase
      .from('escalation_notification')
      .insert({
        violation_id: fields.violation_id,
        investigator_id: fields.investigator_id,
        notes: fields.notes,
        created_at: new Date().toISOString(),
      });
    if (escErr) {
      await supabase.from('adjudication').delete().eq('adjudication_id', row.adjudication_id);
      await supabase
        .from('violation')
        .update({ violation_status: SPRINT3_VIOLATION_STATUS.RESPONSE_SUBMITTED })
        .eq('violation_id', fields.violation_id);
      throw escErr;
    }
  }

  return row;
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
