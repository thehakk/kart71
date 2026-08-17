import { SiteLink } from './SiteLink';
import { ROUTES } from '../lib/routing';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <p className="site-footer-brand">
        <strong>Kart 71</strong> — tarayıcıda ücretsiz 2v2 iskambil oyunu. Kayıt gerekmez.
      </p>
      <nav className="site-footer-nav" aria-label="Alt menü">
        <SiteLink href={ROUTES.home}>Oyna</SiteLink>
        <SiteLink href={ROUTES.rules}>Nasıl oynanır</SiteLink>
        <SiteLink href={ROUTES.about}>Hakkında</SiteLink>
        <SiteLink href={ROUTES.privacy}>Gizlilik</SiteLink>
        <SiteLink href={ROUTES.contact}>İletişim</SiteLink>
      </nav>
      <p className="site-footer-copy">© {new Date().getFullYear()} Kart 71 · by hakkı</p>
    </footer>
  );
}
