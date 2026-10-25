export const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;

/** Benutzername aus einem URL-Segment – null bei kaputter Kodierung oder ungültigem Namen. */
export function parseUsernameParam(raw: string): string | null {
  let name: string;
  try {
    name = decodeURIComponent(raw);
  } catch {
    return null;
  }
  return USERNAME_RE.test(name) ? name : null;
}
