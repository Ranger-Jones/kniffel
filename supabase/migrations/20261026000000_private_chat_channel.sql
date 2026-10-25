-- Chat-Live-Updates über den privaten Kanal "chat:<uuid>" statt eines öffentlichen Kanals.
-- Gleiche Regel wie für "game:<uuid>": nur (nicht ausgestiegene) Mitglieder des Spiels.
create or replace function public.can_use_game_channel(topic text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  if topic is null or topic !~ '^(game|chat):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return exists (
    select 1 from public.game_players
    where game_id = split_part(topic, ':', 2)::uuid and user_id = auth.uid() and not left_game
  );
end $$;
