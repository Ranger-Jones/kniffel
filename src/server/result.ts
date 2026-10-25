export type ServiceResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };
export const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
export const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });
/** Fehlercode bei veralteter expectedVersion – der Client ignoriert ihn still. */
export const STALE = 'STALE';
