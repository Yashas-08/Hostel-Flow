import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Target Supabase URL:', SUPABASE_URL);

// Test executing via fetch to /rest/v1/ or rpc or pg
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: class {} }
});

async function main() {
  const schemaSql = fs.readFileSync(path.join(__dirname, '../../db/supabase-schema.sql'), 'utf8');
  console.log('Schema file read, size:', schemaSql.length, 'bytes');

  // Try calling pg/sql or rpc if available
  try {
    // Check if rpc 'exec_sql' or similar exists
    const res = await supabase.rpc('exec_sql', { sql: schemaSql });
    console.log('exec_sql response:', res);
  } catch (err) {
    console.log('rpc exec_sql not present:', err.message);
  }
}

main();
