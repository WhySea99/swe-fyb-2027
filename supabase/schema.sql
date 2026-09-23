-- Run this once in the Supabase SQL editor on a fresh project.

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  nickname text,
  photo_path text,
  created_at timestamptz not null default now()
);

-- Row Level Security stays ON and we add no policies -- every read/write
-- goes through the service role key on the server, which bypasses RLS.
-- The anon key (used client-side only for the direct storage upload)
-- never touches this table.
alter table submissions enable row level security;

-- Storage: create a bucket called "submissions" from the dashboard
-- (Storage -> New bucket) and set it to PRIVATE. No storage policies
-- are needed for the anon key either -- uploads use a short-lived
-- signed URL minted server-side, scoped to one exact file path.
