const KEY = 'kart71-session';

export interface Kart71Session {
  code: string;
  name: string;
}

export function loadSession(): Kart71Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Kart71Session;
    if (!parsed.code || !parsed.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(session: Kart71Session): void {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(KEY);
}
