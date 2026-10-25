export const PLAYER_COLORS = ['#ff5a5f', '#3d8bff', '#19c99a', '#ffb020', '#8b5cf6', '#f062b0'];

export function seatColor(seat: number): string {
  return PLAYER_COLORS[((seat % PLAYER_COLORS.length) + PLAYER_COLORS.length) % PLAYER_COLORS.length];
}

/** Stabile Farbe für Personen außerhalb eines Spiels (Freunde, Bestenliste). */
export function nameColor(name: string): string {
  let h = 0;
  for (const ch of name.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return seatColor(h);
}
