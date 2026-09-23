import { createClient } from '@supabase/supabase-js';

// Client-side client. Uses the public anon key, which is safe to expose --
// it can't read or write anything on its own since the bucket is private
// and every table access goes through server routes.
export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
