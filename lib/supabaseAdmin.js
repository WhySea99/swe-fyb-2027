import { createClient } from '@supabase/supabase-js';

// Server-only client. Uses the service role key, which bypasses RLS,
// so this file must never be imported into any client component.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

export const BUCKET = 'submissions';
