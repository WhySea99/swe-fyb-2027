# SWE FYB 2027 — Photo Archive

A photo-upload site for the Software Engineering FYB 2027 cohort at UNIDEL.
People upload one photo at a time (up to 5 each, up to 10MB, full quality,
no compression). Nobody can see anyone else's upload — only the admin(s)
can view, download, and delete.

## Stack

Next.js (App Router) + Supabase (Storage + Postgres) + Vercel.

Photos never pass through our own server — the browser uploads straight to
Supabase Storage using a short-lived signed URL. This matters because
Vercel's serverless functions cap request bodies around 4.5MB, which would
silently break 10MB uploads if they went through an API route instead.

## One-time Supabase setup

1. Create a free project at supabase.com.
2. Go to the SQL editor, paste in `supabase/schema.sql`, and run it.
3. Go to Storage → New bucket → name it `submissions` → set it to
   **Private** (not public).
4. Go to Project Settings → API and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret,
     never expose it client-side)

## Local setup

```
cp .env.local.example .env.local
```

Fill in the Supabase values above, plus:
- `ADMIN_PASSWORD` — whatever password you and Joshua will use to log in
- `ADMIN_SESSION_SECRET` — any long random string (this signs the login
  cookie, it doesn't need to be memorable)
- `NEXT_PUBLIC_UPLOAD_DEADLINE` — ISO timestamp for when uploads close
- `MAX_UPLOADS_PER_PERSON` — defaults to 5

Then:
```
npm install
npm run dev
```
Homepage: http://localhost:3000
Admin: http://localhost:3000/admin/login

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. Import it into Vercel.
3. Add all the same env vars from `.env.local` in Vercel's project
   settings (Environment Variables).
4. Deploy.

## Running it again for the next event

You don't need to rebuild anything. Just:
1. Update `NEXT_PUBLIC_UPLOAD_DEADLINE` (locally and in Vercel) to the new
   window, redeploy.
2. Old submissions stay in the dashboard until you delete them, so clear
   out the previous round from `/admin` first if you want a clean slate.

## Known limitations (worth knowing, not blockers)

- **The 5-photo cap is matched by full name text** (case-insensitive).
  A typo or a slightly different spelling of someone's name won't be
  caught. Fine for a class that mostly self-polices; not bulletproof.
- **If someone closes their browser mid-upload**, after the database row
  is created but before the file finishes landing in storage, you'll get
  a submission with no image in the admin grid. Harmless — just delete it
  when you spot it.
- **The zip export loads every photo into memory before sending it.**
  Fine for a cohort-sized batch (tens of people, a few MB each). Not
  built for thousands of files.
- **One shared admin password**, not individual logins. Fine for two
  admins who trust each other; not meant to scale past that.
