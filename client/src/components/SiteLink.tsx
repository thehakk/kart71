import type { MouseEvent, ReactNode } from 'react';
import { navigateTo } from '../lib/routing';

type SiteLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
};

/** Gercek href (tarayici / Googlebot) + istemci tarafi gecis. */
export function SiteLink({ href, children, className }: SiteLinkProps) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    navigateTo(href);
  };

  return (
    <a href={href} className={className} onClick={onClick}>
      {children}
    </a>
  );
}
