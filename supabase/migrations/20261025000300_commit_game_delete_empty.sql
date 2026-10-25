-- Ein Spiel ohne Spieler (letzter hat die Lobby verlassen) wird atomar mit Versionsprüfung gelöscht.
-- So kann ein gleichzeitiger Beitritt das Verlassen nicht "verschlucken": bei Konflikt wiederholt der Server.
create or replace function public.commit_game(
  p_game_id uuid, p_expected_version int, p_state jsonb, p_players jsonb
) returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_status text := p_state ->> 'status';
  v_version int;
begin
  if jsonb_array_length(p_players) = 0 then
    delete from public.games where id = p_game_id and version = p_expected_version;
    if not found then
      raise exception 'version_conflict';
    end if;
    return p_expected_version + 1;
  end if;

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
