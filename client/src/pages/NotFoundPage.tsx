import { SiteLink } from '../components/SiteLink';
import { ROUTES } from '../lib/routing';

export function NotFoundPage() {
  return (
    <main className="content-page">
      <article className="prose">
        <h1>Sayfa bulunamadı</h1>
        <p>
          Bu adres Kart 71 içinde yok. Oyuna katılmak, kuralları okumak veya gizlilik metnine
          ulaşmak için aşağıdaki bağlantıları kullan.
        </p>
        <ul>
          <li>
            <SiteLink href={ROUTES.home}>Ana sayfa — oda aç ve oyna</SiteLink>
          </li>
          <li>
            <SiteLink href={ROUTES.rules}>Kart 71 nasıl oynanır?</SiteLink>
          </li>
          <li>
            <SiteLink href={ROUTES.about}>Hakkında</SiteLink>
          </li>
          <li>
            <SiteLink href={ROUTES.privacy}>Gizlilik politikası</SiteLink>
          </li>
          <li>
            <SiteLink href={ROUTES.contact}>İletişim</SiteLink>
          </li>
        </ul>
      </article>
    </main>
  );
}
