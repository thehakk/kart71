import type { ReactNode } from 'react';
import { SiteLink } from '../components/SiteLink';
import { ROUTES } from '../lib/routing';

/** Ana sayfa yayinci icerigi — oyun aracinin ustunde ve altinda durur. */
export function HomeContent({
  joinForm,
}: {
  joinForm: ReactNode;
}) {
  return (
    <main className="home-main">
      <section className="home-hero prose">
        <p className="eyebrow">Ücretsiz · Kayıt yok · 4 kişi / 2 takım</p>
        <h1>Kart 71 — online 2v2 kart oyunu</h1>
        <p>
          Kart 71, tarayıcıda oynanan dört kişilik bir iskambil oyunudur. İki takım karşılıklı
          oturur; 13 el boyunca per kurar, çift açar ve masayı bitirmeye çalışır. Kazanan, en
          yüksek puanı toplayan değil, <strong>en az ceza puanı yazan</strong> takımdır.
        </p>
        <p>
          Oyun 101 Okey geleneğinden izler taşır ama kendi kural setine sahiptir: açış barajı
          normalde 71&apos;dir, masada çiftçi varsa 101&apos;e yükselir; çift ve çiftçi ayrı bir
          yol açar; işlek atış +71 yazar. Kayıt, üyelik veya uygulama indirme yoktur — oda kodu
          yeter.
        </p>
      </section>

      {joinForm}

      <section className="home-steps" aria-labelledby="basla-baslik">
        <h2 id="basla-baslik">Nasıl başlanır?</h2>
        <ol className="step-list">
          <li>
            <strong>Adını yaz.</strong> İstersen oda kodunu boş bırak; yeni bir oda açılır.
          </li>
          <li>
            <strong>Kodu paylaş.</strong> Üç arkadaşın aynı kodla katılır. Takımlar karşılıklı
            oturur (alt–üst / sol–sağ).
          </li>
          <li>
            <strong>Eksik koltuk varsa bot ekle.</strong> Kuralları tek başına veya iki kişi
            denemek için boş slotları doldurup «Hazırım» de.
          </li>
        </ol>
      </section>

      <section className="feature-grid" aria-labelledby="ozellik-baslik">
        <h2 id="ozellik-baslik" className="visually-hidden">
          Özellikler
        </h2>
        <article className="feature-card">
          <h3>Gerçek zamanlı masa</h3>
          <p>
            Kart çekme, atık alma, sorma, per açma ve işleme sunucuda doğrulanır. Her oyuncu
            yalnızca görmesi gereken kartları görür; rakip eli gizlidir.
          </p>
        </article>
        <article className="feature-card">
          <h3>Botlarla alıştırma</h3>
          <p>
            Dört kişi toplanamadığında boş koltuklar kurala uygun basit botlarla dolar. Çiftçi,
            baraj ve işlek gibi kavramları masada öğrenmek için yeterlidir.
          </p>
        </article>
        <article className="feature-card">
          <h3>13 ellik maç</h3>
          <p>
            Her elin cezası fark olarak yazılır. Maç sonunda toplamı düşük olan takım kazanır.
            Skor tablosu elde elde görünür.
          </p>
        </article>
      </section>

      <section className="prose home-article">
        <h2>Kart 71 nedir?</h2>
        <p>
          Klasik iskambil destesinin iki kopyası (kırmızı ve mavi sırt) ile iki joker bir araya
          gelir: toplam 106 kart. Amaç, elindeki kartları sıralı per (aynı seriden ardışık
          kartlar) veya erkek per (aynı sayı, farklı seriler) halinde masaya indirmek; ya da beş
          veya daha fazla çift ile çift yolundan açmaktır.
        </p>
        <p>
          Sıra sende olduğunda desteden çeker veya son atılan kartı alırsın. Atığı almak bazen
          rakibe sormayı gerektirir; sormadan almak seni o elde <strong>çiftçi</strong> yapar.
          Çiftçi olan oyuncu perle değil çiftle açmak zorundadır ve atık yığınındaki kartları
          görebilir.
        </p>
        <p>
          Açışın bir eşiği vardır. Normalde serdiğin perlerin kart puanı 71 veya üstü olmalıdır.
          Masada bir çiftçi varsa veya biri çift açtıysa bu eşik 101&apos;e çıkar. Sonraki açan,
          bir öncekinden daha yüksek açmak zorundadır. Beş çift ile açışta puana bakılmaz; sonraki
          çift açan altı, sonra yedi çift indirir — yedi çift aynı zamanda bitiştir.
        </p>

        <h2>Neden «71»?</h2>
        <p>
          İsim, oyunun varsayılan açış barajından gelir. 71, resimli ve asların 10–11 sayıldığı
          kart puanıyla ulaşılan ilk ciddi eşiktir. Masadaki gerilim değişince baraj 101&apos;e
          yükselir; bu yüzden erken elde per mi yoksa çift mi birikeceğine karar vermek oyunun
          belkemiğidir. İşlek atışın cezası da yine 71&apos;dir: yerdeki bir pere gidebilecek
          kartı atarsan takımına +71 yazılır.
        </p>

        <h2>Kimler için?</h2>
        <p>
          Okey, 101 veya benzeri dökme oyunlarını bilenler masayı çabuk tanır. Hiç oynamadıysan
          da botlarla bir iki el yeter: sırayla çek, perlerini dene, barajı geçmeden açmaya
          çalışma. Mobil tarayıcıda da çalışır; masaüstü daha rahat bir el görünümü sunar.
        </p>
        <p>
          Ayrıntılı kural metni, puan tablosu, çiftçi istisnaları ve bitiş çarpanları{' '}
          <SiteLink href={ROUTES.rules}>Nasıl oynanır</SiteLink> sayfasındadır. Site hakkında
          kısa bir tanıtım için <SiteLink href={ROUTES.about}>Hakkında</SiteLink>, veriler ve
          reklamlar için <SiteLink href={ROUTES.privacy}>Gizlilik politikası</SiteLink> sayfasına
          bak.
        </p>

        <h2>Sık sorulanlar</h2>
        <dl className="faq-list">
          <dt>Ücretli mi, hesap açmam gerekir mi?</dt>
          <dd>
            Hayır. Kart 71 ücretsizdir ve üyelik yoktur. İsmini yazıp odaya girmen yeter. İsim ve
            oda kodu yalnızca tarayıcında, yeniden bağlanmak için saklanır.
          </dd>
          <dt>Tek başıma oynayabilir miyim?</dt>
          <dd>
            Evet. Oda açıp «Boş slotları bot ile doldur» dersen dört koltuk dolar. Botlar basit
            kural motorudur; turnuva rakibi değil, alıştırma ortağıdır.
          </dd>
          <dt>101 Okey ile aynı mı?</dt>
          <dd>
            Değil. Destede iki joker ve iki sırt rengi vardır, açış 71/101 barajına ve yükselen
            eşiğe bağlıdır, çift / çiftçi ayrı bir yoldur, maç 13 eldir ve kazanan en az cezayı
            yazandır. Benzerlik «dökme + ortak» hissidir; kural metni özgün kabul edilmelidir.
          </dd>
          <dt>Reklam ne zaman görünür?</dt>
          <dd>
            Reklamlar yalnızca bu tanıtım ve kural sayfalarında, yazının yanında yer alır. Oyun
            masasında, lobi koltuk seçiminde, uyarı ve sonuç katmanlarında reklam gösterilmez.
          </dd>
        </dl>
      </section>
    </main>
  );
}
