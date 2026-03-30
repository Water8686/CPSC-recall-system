/**
 * Main DB stores images in public.recall_image; recall has no image_url column.
 */

/**
 * After upserting recalls by recall_number, attach one image per row when image_url is set.
 * Replaces existing images for that recall_id so imports stay idempotent for thumbnails.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {Array<{ recall_number: string, image_url?: string | null }>} records
 */
export async function syncRecallImagesAfterUpsert(supabase, records) {
  for (const rec of records) {
    const url = rec.image_url?.trim();
    if (!url) continue;
    const num = String(rec.recall_number ?? '').trim();
    if (!num) continue;

    const { data: row, error: findErr } = await supabase
      .from('recall')
      .select('recall_id')
      .eq('recall_number', num)
      .maybeSingle();

    if (findErr || !row?.recall_id) continue;

    await supabase.from('recall_image').delete().eq('recall_id', row.recall_id);

    const { error: insErr } = await supabase.from('recall_image').insert({
      recall_id: row.recall_id,
      image_url: url,
    });
    if (insErr) {
      console.warn('syncRecallImagesAfterUpsert:', insErr.message, { recall_number: num });
    }
  }
}
