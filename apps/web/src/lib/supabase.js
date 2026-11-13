import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.PUBLIC_SUPABASE_URL;
const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn('[supabase] PUBLIC_SUPABASE_URL o PUBLIC_SUPABASE_ANON_KEY no están definidos. Google OAuth no funcionará.');
}

export const supabase = createClient(url || 'http://localhost:54321', anonKey || 'dummy');
