create extension if not exists citext with schema extensions;

-- PROFILES -----------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username extensions.citext not null unique
    check (username::text ~ '^[A-Za-z0-9_]{3,20}$'),
  avatar_url text,
  created_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username) values (new.id, new.raw_user_meta_data ->> 'username');
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- FRIENDSHIPS --------------------------------------------------------------
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  check (requester_id <> addressee_id)
);
create unique index friendships_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

-- GAMES --------------------------------------------------------------------
create table public.games (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  host_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'lobby' check (status in ('lobby', 'playing', 'finished')),
  state jsonb not null,
  version int not null default 0,
  rematch_game_id uuid references public.games (id) on delete set null,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);
create index games_status_idx on public.games (status);

create table public.game_players (
  game_id uuid not null references public.games (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  seat int not null,
  left_game boolean not null default false,
  scores jsonb not null default '{}'::jsonb,
  total int,
  place int,
  joined_at timestamptz not null default now(),
  primary key (game_id, user_id)
);
create index game_players_user_idx on public.game_players (user_id);

create table public.game_invites (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (game_id, to_id)
);
create index game_invites_to_idx on public.game_invites (to_id, status);

-- HELPERS ------------------------------------------------------------------
create function public.is_game_member(gid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.game_players where game_id = gid and user_id = auth.uid());
$$;

create function public.commit_game(
  p_game_id uuid, p_expected_version int, p_state jsonb, p_players jsonb
) returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_status text := p_state ->> 'status';
  v_version int;
begin
  update public.games set
    state = p_state,
    status = v_status,
    host_id = (p_state ->> 'hostId')::uuid,
    version = version + 1,
    started_at = case when v_status <> 'lobby' and started_at is null then now() else started_at end,
    finished_at = case when v_status = 'finished' and finished_at is null then now() else finished_at end
  where id = p_game_id and version = p_expected_version
  returning version into v_version;

  if v_version is null then
    raise exception 'version_conflict';
  end if;

  delete from public.game_players gp
  where gp.game_id = p_game_id
    and gp.user_id not in (select (x ->> 'userId')::uuid from jsonb_array_elements(p_players) x);

  insert into public.game_players (game_id, user_id, seat, left_game, scores, total, place)
  select p_game_id, (x ->> 'userId')::uuid, (x ->> 'seat')::int, (x ->> 'left')::boolean,
         x -> 'scores', (x ->> 'total')::int, (x ->> 'place')::int
  from jsonb_array_elements(p_players) x
  on conflict (game_id, user_id) do update set
    seat = excluded.seat, left_game = excluded.left_game, scores = excluded.scores,
    total = excluded.total, place = excluded.place;

  return v_version;
end $$;

revoke execute on function public.commit_game(uuid, int, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.commit_game(uuid, int, jsonb, jsonb) to service_role;

-- RLS ----------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.games enable row level security;
alter table public.game_players enable row level security;
alter table public.game_invites enable row level security;

create policy "profiles lesbar" on public.profiles for select to authenticated using (true);

create policy "eigene Freundschaften" on public.friendships for select to authenticated
  using (auth.uid() in (requester_id, addressee_id));

create policy "eigene Einladungen" on public.game_invites for select to authenticated
  using (auth.uid() in (from_id, to_id));

create policy "Spiele lesbar" on public.games for select to authenticated
  using (
    status = 'finished'
    or public.is_game_member(id)
    or exists (select 1 from public.game_invites i where i.game_id = games.id and i.to_id = auth.uid())
  );

create policy "Spieler lesbar" on public.game_players for select to authenticated
  using (
    public.is_game_member(game_id)
    or exists (select 1 from public.games g where g.id = game_players.game_id and g.status = 'finished')
  );

-- Keine insert/update/delete-Policies: Schreiben nur über service_role.

-- VIEWS --------------------------------------------------------------------
create view public.player_stats with (security_invoker = true) as
select
  p.id as user_id,
  p.username::text as username,
  p.avatar_url,
  count(f.game_id)::int as games_played,
  (count(*) filter (where f.place = 1))::int as wins,
  coalesce(max(f.total), 0)::int as best_score,
  coalesce(round(avg(f.total)), 0)::int as avg_score,
  (count(*) filter (where (f.scores ->> 'kniffel')::int = 50))::int as kniffel_count
from public.profiles p
left join (
  select gp.* from public.game_players gp
  join public.games g on g.id = gp.game_id
  where g.status = 'finished' and gp.left_game = false
) f on f.user_id = p.id
group by p.id;

create view public.leaderboard with (security_invoker = true) as
select * from public.player_stats where games_played > 0;

-- REALTIME -----------------------------------------------------------------
alter publication supabase_realtime add table public.games, public.game_invites, public.friendships;

-- STORAGE ------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Avatar hochladen" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Avatar ersetzen" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Avatar löschen" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
