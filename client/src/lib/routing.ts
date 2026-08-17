import { useCallback, useEffect, useState } from 'react';

export const ROUTES = {
  home: '/',
  play: '/',
  rules: '/nasil-oynanir',
  about: '/hakkinda',
  privacy: '/gizlilik',
  contact: '/iletisim',
} as const;

export type SitePath =
  | typeof ROUTES.home
  | typeof ROUTES.rules
  | typeof ROUTES.about
  | typeof ROUTES.privacy
  | typeof ROUTES.contact;

const KNOWN = new Set<string>(Object.values(ROUTES));

export function normalizePath(pathname: string): string {
  const clean = pathname.replace(/\/+$/, '');
  return clean || '/';
}

export function isSitePath(path: string): path is SitePath {
  return KNOWN.has(path);
}

/** Icerik sayfalari — reklam yalnizca bunlarda yuklenir. */
export function isContentPath(path: string): boolean {
  return path === ROUTES.home || path === ROUTES.rules || path === ROUTES.about;
}

export function navigateTo(path: string): void {
  const next = normalizePath(path);
  if (normalizePath(window.location.pathname) === next) return;
  window.history.pushState({}, '', next);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo(0, 0);
}

export function usePath(): string {
  const [path, setPath] = useState(() =>
    typeof window === 'undefined' ? '/' : normalizePath(window.location.pathname)
  );

  useEffect(() => {
    const onPop = () => setPath(normalizePath(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return path;
}

export function useNavigate(): (path: string) => void {
  return useCallback((path: string) => navigateTo(path), []);
}
