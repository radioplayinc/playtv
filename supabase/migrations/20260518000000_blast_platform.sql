-- Blast: music & viral entertainment clipping campaign platform

create table if not exists blast_campaigns (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  title text not null,
  artist_name text not null,
  cover_url text,
  audio_preview_url text,
  description text,
  genre text default 'various',
  hashtags text[] default array[]::text[],
  total_budget numeric(12,2) not null default 0,
  budget_used numeric(12,2) not null default 0,
  reward_per_1k_views numeric(10,4) not null default 0.50,
  min_clip_length_secs int not null default 5,
  max_clip_length_secs int not null default 60,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  status text not null default 'active' check (status in ('draft','active','paused','ended')),
  allowed_platforms text[] default array['tiktok','instagram','youtube','twitter'],
  total_verified_views bigint not null default 0,
  participant_count int not null default 0,
  clip_count int not null default 0,
  featured boolean not null default false,
  creator_id uuid references auth.users(id) on delete cascade,
  label_name text
);

create table if not exists blast_clips (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  campaign_id uuid not null references blast_campaigns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('tiktok','instagram','youtube','twitter','facebook','other')),
  external_url text not null,
  thumbnail_url text,
  caption text,
  view_count bigint not null default 0,
  verified_views bigint not null default 0,
  earnings numeric(10,4) not null default 0,
  status text not null default 'pending' check (status in ('pending','verified','rejected','paid')),
  last_synced_at timestamptz,
  rejection_reason text
);

create table if not exists blast_participants (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references blast_campaigns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz default now(),
  display_name text,
  avatar_url text,
  total_clips int not null default 0,
  total_verified_views bigint not null default 0,
  total_earnings numeric(10,4) not null default 0,
  rank int,
  unique(campaign_id, user_id)
);

create table if not exists blast_payouts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid references blast_campaigns(id) on delete set null,
  amount numeric(10,4) not null,
  status text not null default 'pending' check (status in ('pending','processing','completed','failed')),
  paid_at timestamptz,
  payment_method text,
  payment_reference text
);

-- Indexes
create index if not exists blast_campaigns_status_idx on blast_campaigns(status);
create index if not exists blast_campaigns_featured_idx on blast_campaigns(featured) where featured = true;
create index if not exists blast_clips_campaign_idx on blast_clips(campaign_id);
create index if not exists blast_clips_user_idx on blast_clips(user_id);
create index if not exists blast_participants_campaign_idx on blast_participants(campaign_id);
create index if not exists blast_participants_user_idx on blast_participants(user_id);

-- RLS
alter table blast_campaigns enable row level security;
alter table blast_clips enable row level security;
alter table blast_participants enable row level security;
alter table blast_payouts enable row level security;

create policy "anyone can read active campaigns" on blast_campaigns
  for select using (status in ('active','ended'));

create policy "authenticated users can create campaigns" on blast_campaigns
  for insert to authenticated with check (creator_id = auth.uid());

create policy "creators can update own campaigns" on blast_campaigns
  for update to authenticated using (creator_id = auth.uid());

create policy "anyone can read clips" on blast_clips
  for select using (true);

create policy "users manage own clips" on blast_clips
  for all to authenticated using (user_id = auth.uid());

create policy "anyone can read participants" on blast_participants
  for select using (true);

create policy "users manage own participation" on blast_participants
  for all to authenticated using (user_id = auth.uid());

create policy "users read own payouts" on blast_payouts
  for select to authenticated using (user_id = auth.uid());

-- Seed sample campaigns for demo
insert into blast_campaigns (title, artist_name, cover_url, description, genre, hashtags, total_budget, reward_per_1k_views, ends_at, status, featured, total_verified_views, participant_count, clip_count, label_name) values
  ('Neon Nights', 'Aria Nova', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80', 'Show us your night out! Share clips featuring Neon Nights and earn for every view you drive.', 'Pop', array['#NeonNights', '#AriaNovaMusic', '#BlastClip'], 15000, 0.75, now() + interval '14 days', 'active', true, 2847293, 1247, 3891, 'Atlantic Records'),
  ('Street Pulse', 'DRK MATTER', 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400&q=80', 'We want your heat. Show your city, your crew, your flow — and get paid for the views.', 'Hip-Hop', array['#StreetPulse', '#DRKMatter', '#BlastHipHop'], 25000, 1.00, now() + interval '7 days', 'active', true, 5123847, 2891, 7233, 'Def Jam'),
  ('Summer Glow', 'The Solstice', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80', 'Capture your golden hour moments. Best clips win bonus rewards on top of per-view earnings.', 'Indie Pop', array['#SummerGlow', '#TheSolstice', '#GoldenHour'], 8000, 0.50, now() + interval '21 days', 'active', false, 892341, 543, 1291, 'Indie Spirit'),
  ('Bass Drop Vol. 3', 'VOID WALKER', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80', 'EDM heads — drop your best dance clips, festival moments, and rave energy. Massive prize pool.', 'EDM', array['#BassDropV3', '#VoidWalker', '#RaveLife'], 50000, 1.25, now() + interval '10 days', 'active', true, 9472891, 4128, 11293, 'Ultra Music'),
  ('Midnight Drive', 'Luna Ray', 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=400&q=80', 'Night drives, city lights, and your best moments. R&B vibes only.', 'R&B', array['#MidnightDrive', '#LunaRay', '#RnBClip'], 12000, 0.65, now() + interval '18 days', 'active', false, 1293847, 891, 2341, 'RCA Records'),
  ('Hype Machine', 'KOLLEKTIV', 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&q=80', 'The biggest rap cypher campaign of the year. Freestyle, battle, flow — show the world.', 'Rap', array['#HypeMachine', '#KOLLEKTIV', '#BlastRap'], 35000, 0.90, now() + interval '5 days', 'active', true, 7834923, 3421, 9823, 'Warner Records')
on conflict do nothing;
