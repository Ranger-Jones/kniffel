-- Privater Presence-Kanal "online" für den Online-Status unter Freunden: nur eingeloggte Nutzer.
create policy "Online-Kanal lesen" on realtime.messages for select to authenticated
  using (realtime.topic() = 'online');

create policy "Online-Kanal senden" on realtime.messages for insert to authenticated
  with check (realtime.topic() = 'online');
