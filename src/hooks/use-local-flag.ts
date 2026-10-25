'use client';
import { useCallback, useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();

function read(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

/** Kleiner, pro Gerät gespeicherter Schalter (z. B. "Chat eingeklappt"). */
export function useLocalFlag(key: string): [boolean, (v: boolean) => void] {
  const value = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => read(key),
    () => false,
  );
  const set = useCallback((v: boolean) => {
    try {
      localStorage.setItem(key, v ? '1' : '0');
    } catch {
      // Speicher nicht verfügbar (privates Fenster) – dann gilt es nur bis zum Neuladen nicht.
    }
    listeners.forEach((l) => l());
  }, [key]);
  return [value, set];
}
