import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in server/.env');
  process.exit(1);
}

// Safety check: verify NOT RepPulse
if (SUPABASE_URL.includes('rqrjuvnzmcndbfaahngj')) {
  console.error('FATAL: RepPulse project detected! Aborting to protect project separation.');
  process.exit(1);
}

console.log('SUPABASE_URL configured:', SUPABASE_URL.replace(/(\/\/[^.]+).*/, '$1...'));
console.log('Checking connection to dedicated Hostel Flow Supabase project...');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function testConnection() {
  try {
    // Try to list tables or run a lightweight test
    const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
    if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
      console.log('API Response status:', error.message);
    } else {
      console.log('Connection to Supabase project confirmed successfully!');
    }
  } catch (err) {
    console.error('Connection error:', err.message);
    process.exit(1);
  }
}

testConnection();
