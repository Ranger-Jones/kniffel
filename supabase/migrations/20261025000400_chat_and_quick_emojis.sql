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

-- Höchstens eine Nachricht pro Sekunde und Spieler – in der Datenbank erzwungen, damit auch
-- gleichzeitige Anfragen das Limit nicht umgehen (Sperre pro Spieler und Spiel).
create function public.game_messages_rate_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.game_id::text || ':' || new.user_id::text));
  if exists (
    select 1 from public.game_messages m
    where m.game_id = new.game_id and m.user_id = new.user_id
      and m.created_at > clock_timestamp() - interval '1 second'
  ) then
    raise exception 'chat_rate_limit';
  end if;
  new.created_at := clock_timestamp();
  return new;
end $$;

create trigger game_messages_rate_limit before insert on public.game_messages
  for each row execute function public.game_messages_rate_limit();

alter publication supabase_realtime add table public.game_messages;

-- Persönliche Emoji-Schnellwahl (null = Standard).
alter table public.profiles add column quick_emojis text[];
