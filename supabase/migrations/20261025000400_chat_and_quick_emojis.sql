-- Chat pro Spiel: Lesen für Mitspieler (RLS), Schreiben nur über den Server (Service-Role).
create table public.game_messages (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now()
);
create index game_messages_game_idx on public.game_messages (game_id, created_at);
alter table public.game_messages enable row level security;

create policy "Chat lesbar für Mitspieler" on public.game_messages for select to authenticated
  using (public.is_game_member(game_id));

alter publication supabase_realtime add table public.game_messages;

-- Persönliche Emoji-Schnellwahl (null = Standard).
alter table public.profiles add column quick_emojis text[];
