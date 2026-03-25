import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSupabaseUrl } from './serverEnv.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = getSupabaseUrl();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.warn(
    'Warning: Missing Supabase env vars for server. ' +
    'The service role client will not be available. ' +
    'Copy .env.example to .env and add your credentials.'
  );
}

/**
 * Service role client — bypasses Row Level Security.
 * Optional: keep in production secrets only for server-side jobs (e.g. Zapier), not for this SPA.
 */
export const supabaseAdmin = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;
