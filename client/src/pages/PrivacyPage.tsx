import { SiteLink } from '../components/SiteLink';
import { ROUTES } from '../lib/routing';

const UPDATED = '17 Ağustos 2026';
const CONTACT_EMAIL = 'h.hakann.ozturk@gmail.com';

export function PrivacyPage() {
  return (
    <main className="content-page">
      <article className="prose">
        <p className="eyebrow">Yasal</p>
        <h1>Gizlilik politikası</h1>
        <p>
          Bu politika, <strong>kart71.vercel.app</strong> adresindeki Kart 71 sitesinin kişisel
          verileri ve çerezleri nasıl işlediğini açıklar. Site hakkı (Hakan Öztürk) tarafından
          işletilir. Son güncelleme: {UPDATED}.
        </p>

        <h2>1. Özet</h2>
        <p>
          Kart 71 hesap açmaz, bülten kaydı tutmaz ve ödeme almaz. Oyuna girmek için bir görünen
          ad yeterlidir. Reklam göstermek için Google AdSense kullanılabilir; bu durumda Google
          çerez ve benzeri teknolojiler kullanır.
        </p>

        <h2>2. Veri sorumlusu ve iletişim</h2>
        <p>
          Veri sorumlusu: Hakan Öztürk (Kart 71). Sorular, erişim ve silme talepleri için{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> veya{' '}
          <SiteLink href={ROUTES.contact}>iletişim sayfası</SiteLink>.
        </p>

        <h2>3. İşlenen veriler</h2>
        <h3>Oyuna katılırken</h3>
        <ul>
          <li>
            <strong>Görünen ad:</strong> yazdığın oyuncu adı. Gerçek kimlik doğrulaması yoktur;
            takma ad kullanabilirsin.
          </li>
          <li>
            <strong>Oda kodu:</strong> katıldığın veya açtığın odanın kısa kodu.
          </li>
          <li>
            <strong>Oyun hamleleri:</strong> el, atık, per ve skor bilgisi odadaki oyunun
            yürütülmesi için sunucuda tutulur. Oda dağıldıktan sonra kalıcı bir oyuncu profili
            oluşturulmaz.
          </li>
        </ul>
        <h3>Tarayıcında saklananlar</h3>
        <p>
          Yeniden bağlanabilmen için ad ve oda kodu <code>localStorage</code> içinde tutulur.
          Odadan ayrılınca bu kayıt silinir. Çerez benzeri bir oturum çerezi zorunlu değildir.
        </p>
        <h3>Teknik günlükler</h3>
        <p>
          Barındırma sağlayıcıları (Vercel, Render) bağlantı zamanı, tarayıcı türü ve IP gibi
          sunucu günlüklerini kendi altyapı politikalarına göre kısa süre tutabilir. Kart 71 bu
          günlüklerden pazarlama profili çıkarmaz.
        </p>
        <h3>Toplanmayanlar</h3>
        <ul>
          <li>Hesap şifresi, telefon numarası, adres veya ödeme bilgisi istenmez.</li>
          <li>Konumun özellikle kaydedilmez.</li>
          <li>Çocuklara yönelik bir hizmet değildir; 13 yaşından küçüklerden bilinçli veri toplanmaz.</li>
        </ul>

        <h2>4. Amaç ve hukuki dayanak</h2>
        <p>Veriler şu amaçlarla işlenir:</p>
        <ul>
          <li>Odayı kurmak, oyunu yürütmek ve kopunca aynı masaya dönmeni sağlamak.</li>
          <li>Hataları gidermek ve sunucuyu ayakta tutmak.</li>
          <li>
            Sitenin tanıtım ve kural sayfalarında reklam göstermek (AdSense), böylece barındırma
            maliyetine katkı sağlamak.
          </li>
        </ul>
        <p>
          Dayanak, hizmeti sunmak için gereken işlem (sözleşmenin ifası niteliğinde oyun
          oturumu) ve meşru menfaattir. Reklam çerezleri için tarayıcı ayarların ve Google&apos;ın
          reklam tercihleri geçerlidir.
        </p>

        <h2>5. Çerezler ve Google AdSense</h2>
        <p>
          Kart 71, Google AdSense kullanarak sitede reklam gösterebilir. Google dahil üçüncü taraf
          tedarikçiler, bu sitenin ve diğer sitelerin ziyaretine dayalı reklam sunmak için çerez
          kullanır. Reklamlar kişiselleştirilmiş veya bağlama dayalı olabilir.
        </p>
        <p>
          Google&apos;ın reklam çerezlerini nasıl kullandığı:{' '}
          <a href="https://policies.google.com/technologies/ads" rel="noopener noreferrer">
            policies.google.com/technologies/ads
          </a>
          . Kişiselleştirilmiş reklamlardan çıkış:{' '}
          <a href="https://www.google.com/settings/ads" rel="noopener noreferrer">
            google.com/settings/ads
          </a>{' '}
          ve{' '}
          <a href="https://optout.aboutads.info/" rel="noopener noreferrer">
            aboutads.info
          </a>
          .
        </p>
        <p>
          AdSense yayıncı kimliği <code>ca-pub-7173185304556215</code> ile doğrulanır.{' '}
          <a href="/ads.txt">ads.txt</a> dosyası yetkili satıcıları listeler. Reklam birimleri
          yalnızca yayıncı içeriği olan sayfalarda (ana sayfa tanıtımı, kural ve hakkında
          metinleri) çağrılır; oyun masası, uyarı katmanı ve boş lobi ekranında reklam
          gösterilmez.
        </p>

        <h2>6. Aktarım ve saklama</h2>
        <p>
          Oyun sunucusu ve statik site Avrupa veya ABD merkezli barındırıcılarda çalışabilir.
          Google, reklam için veriyi kendi altyapısında işler. Oyun odası verisi oda kapanınca
          tutulmaz; tarayıcıdaki ad/kod kaydı sen silene veya odadan ayrılana kadar durur.
        </p>

        <h2>7. Hakların</h2>
        <p>
          KVKK ve geçerli olduğu ölçüde GDPR kapsamında bilgilenme, erişim, düzeltme, silme ve
          itiraz hakların vardır. Hesap olmadığı için «profil sil» düğmesi yoktur: odadan ayrılmak
          yerel kaydı temizler. Ek silme talebi için e-posta yeterlidir.
        </p>

        <h2>8. Dış bağlantılar</h2>
        <p>
          GitHub ve Google politika sayfaları gibi dış sitelerin kendi gizlilik metinleri vardır.
          Kart 71 onların içeriğinden sorumlu değildir.
        </p>

        <h2>9. Değişiklikler</h2>
        <p>
          Politika güncellenirse bu sayfadaki tarih değişir. Önemli değişikliklerde mümkünse sitede
          kısa bir duyuru yer alır.
        </p>

        <p>
          <SiteLink href={ROUTES.home}>Ana sayfaya dön</SiteLink>
          {' · '}
          <SiteLink href={ROUTES.contact}>İletişim</SiteLink>
        </p>
      </article>
    </main>
  );
}
