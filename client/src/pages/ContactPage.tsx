import { SiteLink } from '../components/SiteLink';
import { ROUTES } from '../lib/routing';

const CONTACT_EMAIL = 'h.hakann.ozturk@gmail.com';

export function ContactPage() {
  return (
    <main className="content-page">
      <article className="prose">
        <p className="eyebrow">Kart 71</p>
        <h1>İletişim</h1>
        <p>
          Kart 71 bağımsız bir oyundur. Kural sorusu, hata bildirimi, gizlilik talebi veya iş
          birliği için aşağıdaki kanalları kullan.
        </p>

        <h2>E-posta</h2>
        <p>
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
        <p>
          Mümkünse konu satırına «Kart 71» ve kısa bir başlık yaz. Oyundaki bir hataysa tarayıcı,
          yaklaşık zaman ve oda kodu (paylaşmak istersen) işe yarar. Kişisel veri içeren
          ekran görüntüsü gönderme.
        </p>

        <h2>Kaynak kod ve sorun takibi</h2>
        <p>
          Açık depo:{' '}
          <a href="https://github.com/thehakk/kart71" rel="noopener noreferrer">
            github.com/thehakk/kart71
          </a>
          . Teknik öneriler için GitHub Issues da kullanılabilir.
        </p>

        <h2>Gizlilik</h2>
        <p>
          Veri işleme, çerezler ve reklamlar{' '}
          <SiteLink href={ROUTES.privacy}>gizlilik politikasında</SiteLink> anlatılır. KVKK
          kapsamındaki talepler aynı e-posta adresine yöneltilir.
        </p>

        <h2>Yanıt süresi</h2>
        <p>
          Site tek kişi tarafından yürütülür. Yanıt genellikle birkaç gün içinde gelir; acil bir
          destek hattı veya 7/24 operatör yoktur.
        </p>

        <p>
          <SiteLink href={ROUTES.home}>Oyuna dön</SiteLink>
          {' · '}
          <SiteLink href={ROUTES.rules}>Nasıl oynanır</SiteLink>
        </p>
      </article>
    </main>
  );
}
