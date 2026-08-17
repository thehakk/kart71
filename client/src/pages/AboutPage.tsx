import { SiteLink } from '../components/SiteLink';
import { AdSlot } from '../components/AdSlot';
import { ROUTES } from '../lib/routing';

const CONTENT_AD_SLOT = import.meta.env.VITE_ADSENSE_SLOT_LOBBY?.trim();

export function AboutPage() {
  return (
    <main className="content-page">
      <article className="prose">
        <p className="eyebrow">Kart 71</p>
        <h1>Hakkında</h1>
        <p>
          Kart 71, tarayıcıda çalışan bağımsız bir iskambil oyunudur. Dört kişi, iki takım, 13
          el. Sunucu oyunun kurallarını doğrular; istemci masayı gösterir. Amaç, arkadaşlarınla
          aynı masaya oturup kayıt ekranına takılmadan oynamaktır.
        </p>
        <p>
          Proje hakkı (Hakan Öztürk) tarafından geliştirilir. Ticari bir stüdyo ürünü değildir;
          kural seti, masa akışı ve puanlama bu sitedeki oyuna özgüdür. 101 Okey ve benzeri
          dökme oyunlarından tanıdık bir his vardır ama Kart 71 onların kopyası değildir.
        </p>

        <h2>Nasıl çalışır?</h2>
        <p>
          Oda ve oyun durumu bir Node.js sunucusundadır. Tarayıcı Socket.IO ile bağlanır. Kart
          dağıtımı, yasal hamleler ve ceza hesabı sunucuda yapılır; rakibin elini görmezsin.
          İstemci React ile yazılmıştır ve Vercel üzerinde yayınlanır.
        </p>
        <p>
          Üyelik yoktur. Girdiğin isim ve oda kodu, sayfayı yenilediğinde aynı masaya dönebilmen
          için tarayıcında tutulur. Ayrıntı{' '}
          <SiteLink href={ROUTES.privacy}>gizlilik politikasında</SiteLink>dır.
        </p>

        <h2>Neyi vaat eder, neyi etmez?</h2>
        <ul>
          <li>Ücretsiz oyna, oda kodu ile davet et, botlarla çalış.</li>
          <li>
            Kurallar <SiteLink href={ROUTES.rules}>Nasıl oynanır</SiteLink> sayfasında yazılıdır;
            masa bu metne göre işler.
          </li>
          <li>
            Botlar alıştırma içindir. İleri düzey bir yapay zekâ veya sıralı lig yoktur.
          </li>
          <li>Bahis, gerçek para veya ödül çarkı yoktur.</li>
        </ul>

        <h2>Reklam ve destek</h2>
        <p>
          Sitenin tanıtım ve kural sayfalarında Google AdSense reklamı bulunabilir. Reklam oyun
          masasına, koltuk seçimine veya sonuç katmanına yerleştirilmez. Gelir, sunucu ve alan
          adını ayakta tutmaya yardımcıdır; oyun içi satın alma yoktur.
        </p>

        <h2>Katkı ve iletişim</h2>
        <p>
          Hata, kural belirsizliği veya öneri için{' '}
          <SiteLink href={ROUTES.contact}>iletişim sayfasını</SiteLink> kullan. Kaynak kod{' '}
          <a href="https://github.com/thehakk/kart71" rel="noopener noreferrer">
            github.com/thehakk/kart71
          </a>{' '}
          adresindedir.
        </p>

        <AdSlot slot={CONTENT_AD_SLOT} format="horizontal" className="ad-content" />
      </article>
    </main>
  );
}
