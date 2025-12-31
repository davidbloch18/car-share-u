import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

let SUPABASE_URL = process.env.VITE_SUPABASE_URL;
let SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// If running in a runtime that doesn't auto-load .env (Node), attempt to read the .env file
if ((!SUPABASE_URL || !SUPABASE_KEY) && fs.existsSync('./.env')) {
  const env = fs.readFileSync('./.env', 'utf8');
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^\s*([^#=\s]+)\s*=\s*"?([^"#]*)"?\s*$/);
    if (m) {
      const k = m[1];
      const v = m[2];
      if (!process.env[k]) process.env[k] = v;
    }
  }
  SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing VITE_SUPABASE_* env vars. Check .env or set environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const email = `test+${Date.now()}@example.com`;
const password = 'Test123!';

console.log('Attempting sign-up with', email);

(async () => {
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    console.log('Response:');
    console.dir({ data, error }, { depth: null });

    if (error) {
      console.log('Sign-up returned an error.');
      process.exit(1);
    }

    if (data?.session) {
      console.log('SUCCESS: signUp returned a session (email confirmation is not required).');
      console.log('User id:', data.user?.id);
    } else {
      console.log('INFO: signUp did NOT return a session (email confirmation likely required).');
      console.log('Check Supabase dashboard Authentication settings -> Require email confirmation.');
    }
  } catch (e) {
    console.error('Exception during sign-up', e);
    process.exit(1);
  }
})();