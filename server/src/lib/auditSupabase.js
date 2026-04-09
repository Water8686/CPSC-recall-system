import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const auditUrl = process.env.AUDIT_SUPABASE_URL?.trim() || '';
const auditKey = process.env.AUDIT_SUPABASE_SERVICE_ROLE_KEY?.trim() || '';

/**
 * Optional second Supabase project for login/session audit only.
 * Null when env is unset — audit calls become no-ops.
 */
export const auditSupabase =
  auditUrl && auditKey
    ? createClient(auditUrl, auditKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;
