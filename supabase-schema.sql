-- MediaPro OS — Supabase schema
-- Run this once in the Supabase SQL editor for your project.

-- Enable UUID generation extension (already enabled on most Supabase projects)
create extension if not exists "pgcrypto";

-- ── Clients ──────────────────────────────────────────────────────────────────
create table if not exists clients (
  id         uuid        default gen_random_uuid() primary key,
  name       text        not null unique,
  created_at timestamptz default now()
);

-- ── Campaigns ─────────────────────────────────────────────────────────────────
create table if not exists campaigns (
  id         uuid        default gen_random_uuid() primary key,
  client     text        not null,
  name       text        not null,
  platform   text        not null check (platform in ('Meta', 'TikTok', 'Snapchat', 'Google')),
  status     text        not null default 'Active'
                         check (status in ('Active', 'Paused', 'Ended')),
  budget     numeric     not null default 0,
  spend      numeric     not null default 0,
  sales      numeric     not null default 0,
  leads      integer     not null default 0,
  -- Computed columns (Postgres generated always stored)
  roas       numeric     generated always as (
                           case when spend > 0 then round(sales / spend, 2) else 0 end
                         ) stored,
  cpl        numeric     generated always as (
                           case when leads > 0 then round(spend / leads, 2) else 0 end
                         ) stored,
  created_at timestamptz default now()
);

-- ── Row Level Security ────────────────────────────────────────────────────────
-- Adjust these policies to match your auth requirements.
-- The defaults below allow all authenticated users full access.
alter table clients   enable row level security;
alter table campaigns enable row level security;

-- Allow anon reads (needed for the localStorage fallback mode where the
-- app calls Supabase without auth; remove if you add user auth).
create policy "anon read clients"   on clients   for select using (true);
create policy "anon write clients"  on clients   for all    using (true);
create policy "anon read campaigns" on campaigns for select using (true);
create policy "anon write campaigns" on campaigns for all   using (true);
