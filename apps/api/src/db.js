require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.warn('[db] SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no están definidos. La API no funcionará hasta configurarlos.');
}

// Cliente con service_role: bypasea RLS, el backend filtra por user_id manualmente.
const supabase = createClient(url || 'http://localhost:54321', serviceKey || 'dummy', {
  auth: { persistSession: false, autoRefreshToken: false },
});

module.exports = { supabase };
