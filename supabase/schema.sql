-- ─────────────────────────────────────────────────────────────────────────────
-- AI on the Streets — Supabase Schema
-- Run this entire file in: Supabase Dashboard → SQL Editor → New query → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══ 1. SITE STATS ════════════════════════════════════════════════════════════
create table if not exists site_stats (
  key        text primary key,
  value      integer not null default 0,
  updated_at timestamptz not null default now()
);

insert into site_stats (key, value) values
  ('students_reached',     100),
  ('workshops_conducted',  5),
  ('community_partners',   6),
  ('schools_visited',      3)
on conflict (key) do nothing;

alter table site_stats enable row level security;
create policy "Public read stats"  on site_stats for select using (true);
create policy "Admin update stats" on site_stats for update using (auth.role() = 'authenticated');

-- ═══ 2. EVENT FEEDBACK ════════════════════════════════════════════════════════
create table if not exists event_feedback (
  id               bigint generated always as identity primary key,
  created_at       timestamptz not null default now(),
  session_id       text,
  workshop_name    text,
  participant_name text,
  grade_level      text not null,
  before_rating    smallint not null check (before_rating between 1 and 5),
  after_rating     smallint not null check (after_rating  between 1 and 5),
  comment          text,
  workshop_tier    text,
  ip_hash          text
);

create index if not exists event_feedback_created_at_idx on event_feedback (created_at desc);
create index if not exists event_feedback_grade_level_idx on event_feedback (grade_level);

alter table event_feedback enable row level security;
create policy "Public insert feedback" on event_feedback for insert with check (true);
create policy "Public read feedback"   on event_feedback for select using (true);
create policy "Admin delete feedback"  on event_feedback for delete using (auth.role() = 'authenticated');

-- ═══ 3. WORKSHOPS (request form) ═════════════════════════════════════════════
create table if not exists workshops (
  id              bigint generated always as identity primary key,
  created_at      timestamptz not null default now(),
  name            text not null,
  organization    text not null,
  email           text not null,
  grade_level     text,
  num_students    integer,
  preferred_date  text,
  message         text,
  status          text not null default 'pending',
  admin_notes     text
);

create index if not exists workshops_created_at_idx on workshops (created_at desc);
create index if not exists workshops_status_idx     on workshops (status);

alter table workshops enable row level security;
create policy "Public insert workshop"  on workshops for insert with check (true);
create policy "Admin view workshops"    on workshops for select using (auth.role() = 'authenticated');
create policy "Admin update workshops"  on workshops for update using (auth.role() = 'authenticated');

-- ═══ VIEWS (useful in the Supabase dashboard) ════════════════════════════════
create or replace view feedback_summary as
select
  grade_level,
  count(*)                                              as response_count,
  round(avg(before_rating)::numeric, 2)                as avg_before,
  round(avg(after_rating)::numeric,  2)                as avg_after,
  round(avg(after_rating - before_rating)::numeric, 2) as avg_improvement
from event_feedback
group by grade_level
order by response_count desc;
