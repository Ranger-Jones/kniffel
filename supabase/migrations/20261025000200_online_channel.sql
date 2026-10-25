-- Online-Status pro Nutzer: Kanal "online:<uuid>".
-- Lesen (Presence empfangen): der Nutzer selbst und angenommene Freunde.
-- Senden (Presence tracken): nur der Nutzer selbst – niemand kann den Status eines anderen vortäuschen.
create function public.can_read_online_channel(topic text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  owner uuid;
begin
  if topic is null or topic !~ '^online:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  owner := substring(topic from 8)::uuid;
  return owner = auth.uid() or exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = owner and f.addressee_id = auth.uid())
        or (f.addressee_id = owner and f.requester_id = auth.uid()))
  );
end $$;

create policy "Online-Kanal lesen" on realtime.messages for select to authenticated
  using (public.can_read_online_channel(realtime.topic()));

create policy "Online-Kanal senden" on realtime.messages for insert to authenticated
  with check (realtime.topic() = 'online:' || auth.uid()::text);
