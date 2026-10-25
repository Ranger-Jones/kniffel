-- Private Realtime-Kanäle "game:<uuid>": nur Mitglieder des Spiels dürfen lesen (Presence/Broadcast/Changes) und senden.
create function public.can_use_game_channel(topic text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  if topic is null or topic !~ '^game:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return exists (
    select 1 from public.game_players
    where game_id = substring(topic from 6)::uuid and user_id = auth.uid() and not left_game
  );
end $$;

create policy "Spielkanal lesen" on realtime.messages for select to authenticated
  using (public.can_use_game_channel(realtime.topic()));

create policy "Spielkanal senden" on realtime.messages for insert to authenticated
  with check (public.can_use_game_channel(realtime.topic()));
