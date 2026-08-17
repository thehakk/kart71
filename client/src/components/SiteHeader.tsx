import { Logo } from './Logo';
import { SiteLink } from './SiteLink';
import { ROUTES } from '../lib/routing';

type SiteHeaderProps = {
  path: string;
  connected: boolean;
  reconnecting: boolean;
};

export function SiteHeader({ path, connected, reconnecting }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <SiteLink href={ROUTES.home} className="site-brand">
        <Logo size={40} />
      </SiteLink>
      <nav className="site-nav" aria-label="Site menüsü">
        <SiteLink href={ROUTES.home} className={path === ROUTES.home ? 'active' : undefined}>
          Oyna
        </SiteLink>
        <SiteLink href={ROUTES.rules} className={path === ROUTES.rules ? 'active' : undefined}>
          Nasıl oynanır
        </SiteLink>
        <SiteLink href={ROUTES.about} className={path === ROUTES.about ? 'active' : undefined}>
          Hakkında
        </SiteLink>
        <SiteLink href={ROUTES.contact} className={path === ROUTES.contact ? 'active' : undefined}>
          İletişim
        </SiteLink>
      </nav>
      <span className={`conn ${connected ? 'on' : 'off'}`}>
        {reconnecting ? 'Yeniden bağlanılıyor…' : connected ? 'Bağlandı' : 'Bağlantı yok'}
      </span>
    </header>
  );
}
