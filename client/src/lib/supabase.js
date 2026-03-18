import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const isMockMode = import.meta.env.VITE_MOCK_MODE === 'true' ||
  !supabaseUrl ||
  !supabaseAnonKey;

export { isMockMode };

export const supabase = isMockMode
  ? null
  : createClient(supabaseUrl, supabaseAnonKey);
