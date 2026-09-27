-- Run this in the Supabase SQL editor to add the new metadata columns.
-- Safe to run on an existing submissions table.

alter table submissions
  add column if not exists allow_public_feature boolean not null default false,
  add column if not exists level text,
  add column if not exists category text,
  add column if not exists caption text,
  add column if not exists event_name text;
