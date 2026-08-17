import { SiteLink } from '../components/SiteLink';
import { AdSlot } from '../components/AdSlot';
import { ROUTES } from '../lib/routing';

const CONTENT_AD_SLOT = import.meta.env.VITE_ADSENSE_SLOT_LOBBY?.trim();

export function RulesPage() {
  return (
    <main className="content-page">
      <article className="prose">
        <p className="eyebrow">Oyuncu rehberi</p>
        <h1>Kart 71 nasıl oynanır?</h1>
        <p>
          Bu sayfa Kart 71 masasının resmi oyuncu kılavuzudur. Amaç; per ve çift kurarak eli
          bitirmek, 13 el sonunda takımına mümkün olduğunca az ceza yazdırmaktır. Aşağıdaki
          metin masaüstü ve mobil oyundaki davranışla uyumludur.
        </p>
        <p>
          Hemen denemek için <SiteLink href={ROUTES.home}>ana sayfadan oda aç</SiteLink>. Eksik
          oyuncu yerine bot koyabilirsin.
        </p>

        <h2>1. Oyuncular, takımlar, maç</h2>
        <p>
          Masa her zaman dört kişidir. Takım 1 alt ve üst koltukta, Takım 2 sol ve sağda oturur —
          yani ortağın karşındadır, yanındakiler rakiptir. Boş koltuğa tıklayarak yerini seçersin
          veya «Rastgele takımlar» ile dağıtırsın.
        </p>
        <p>
          Bir maç <strong>13 el</strong> sürer. Her elin sonunda iki takımın ham cezası
          hesaplanır; skora yalnızca fark yazılır. 13. el bitince toplam cezası düşük olan takım
          kazanır. Beraberlik mümkündür.
        </p>

        <h2>2. Deste ve kart puanları</h2>
        <p>
          106 kart vardır: iki tam iskambil destesi (kırmızı sırtlı ve mavi sırtlı) artı iki
          joker. Aynı kâğıdın iki kopyası sırt rengiyle ayrılır; çift tam da bu iki kopyanın
          birleşimidir (örneğin kırmızı 7♥ + mavi 7♥).
        </p>
        <table>
          <caption>Açış ve elde kalan kartlar için puanlar</caption>
          <thead>
            <tr>
              <th>Kart</th>
              <th>Puan</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>As (A)</td>
              <td>11</td>
            </tr>
            <tr>
              <td>K, Q, J</td>
              <td>10</td>
            </tr>
            <tr>
              <td>10 … 2</td>
              <td>Kendi sayısı</td>
            </tr>
            <tr>
              <td>Joker (elde kalırsa)</td>
              <td>25</td>
            </tr>
          </tbody>
        </table>
        <p>
          Bu puanlar ceza yazımının kendisi değildir. Ceza; 100 tabanı, çarpanlar, kafa bonusu ve
          işlek ile hesaplanır. Kart puanı açış eşiğinde, kafa aralığında ve kaybeden açanın elde
          kalanında kullanılır.
        </p>

        <h2>3. Dağıtım</h2>
        <p>
          Desteyi dağıtandan önceki oyuncu keser. Kesme joker gelirse joker kesene kalır; o elde
          13 kart + joker = 14 kartla başlar. Herkese 14 kart dağılır. Destenin en altına rastgele
          bir <strong>taban</strong> konur ve masada görünür. Taban, çiftte joker benzeri bir eş
          gibi kullanılabilir; destede tabanla aynı seri ve sayılı diğer kopya da çiftte wild
          sayılır.
        </p>
        <p>
          Çekme destesinin üstü yere açılır. Başlayan oyuncu (dağıtanın üstündeki) bu açık kartı
          alırsa çiftçi olmadan başlar ve bir kart atar; beğenmezse desteden çeker.
        </p>

        <h2>4. Perler</h2>
        <ul>
          <li>
            <strong>Sıralı per:</strong> aynı seriden ardışık kartlar, örneğin 5♥–6♥–7♥. As
            yalnızca üsttedir (…Q–K–A). A–2–3 geçersizdir; sarma yoktur.
          </li>
          <li>
            <strong>Erkek per:</strong> aynı sayı, farklı seriler, örneğin 7♥–7♦–7♣.
          </li>
        </ul>
        <p>
          Bir perde her kart benzersiz olmalıdır: aynı kâğıdın kırmızı ve mavi kopyası aynı pere
          giremez. Per en fazla beş karttır. Joker wild olarak durabilir ve temsil ettiği kartın
          puanını taşır.
        </p>

        <h2>5. Sıra: çek, aç veya işle, at</h2>
        <p>
          Sırandayken önce kart alırsın (kapalı deste veya son atık), isteğe bağlı açar veya
          işlersin, sonra bir kart atarsın. Yalnızca en üstteki atık alınabilir.
        </p>
        <p>
          Atılan kart, atan oyuncuya sorulmadan alınamaz. Sormadan alan <strong>çiftçi</strong>{' '}
          olur. İstenen kartı atan vermezse atan da çiftçi olur. Çiftçi, atığa tıkladığında
          sormadan alır; ama yalnızca elindeki bir çifti tamamlayan atığı alabilir (joker ve taban
          bu «işe yarar atık» sayılmaz).
        </p>
        <p>
          Sorup kartı alırsan ya çifte gidersin, ya perden açarsın, ya da çiftle bitirirsin. Perle
          bitiremezsin; bunlardan birini yapmadan kart atarsan yine çiftçi olursun. Yerdeki bir
          pere giden <strong>işlek atık</strong> sorulamaz.
        </p>
        <p>
          Elin ilk dört atığı düşene kadar per sorulamaz ve perle açılamaz. Çifte gitmek ve
          bitirmek bu erken fazda serbesttir. İstersen atık almadan «Çifte git» diyerek de çiftçi
          olabilirsin.
        </p>

        <h2>6. Çiftçi</h2>
        <p>
          Çiftçi olan oyuncu o elde yalnızca çift ile açabilir ve çiftten bitebilir. Açılmış
          perlere işleyemez. Attığı kart başkası için işlek olabilir. Çifte giden oyuncu tüm atık
          yığınını görür; iki takımda da çiftçi varsa herkes görür.
        </p>

        <h2>7. Açış barajı, çift ve işleme</h2>
        <h3>Perden açma</h3>
        <p>
          Perleri yere sermek açıştır. Açış değeri, serilen kartların puan toplamıdır. Baraj
          normalde <strong>71+</strong>dır. Masada çiftçi varsa veya biri çift açtıysa perden açma
          barajı <strong>101+</strong> olur; hâlihazırda açmış oyuncular etkilenmez. Sonraki açan,
          bir önceki açandan yüksek açmalıdır (gerekli değer = max(baraj, önceki + 1)).
        </p>
        <h3>Çiftten açma</h3>
        <p>
          Beş çift ile açılır; puana bakılmaz. Sonraki çift açan altı, sonraki yedi çift indirir.
          Yedi çift = 14 kart = çiftten bitiş. Çift, aynı kartın iki sırt kopyasıdır; joker bir
          yanı tamamlayabilir.
        </p>
        <h3>İşleme ve işlek</h3>
        <p>
          Açtıktan sonra, sıran sende iken kendi, ortak veya rakip perlerine kart ekleyebilirsin.
          Çiftçi işleyemez. Per açıldıktan sonra, atılan kart masadaki herhangi bir pere
          işlenebiliyorsa bu <strong>işlek atıştır</strong> ve atan takıma +71 yazılır. Elden veya
          atıktan işlemek ceza doğurmaz.
        </p>
        <h3>Joker ve taban atıkları</h3>
        <p>
          Bitiş atışı hariç, fiziksel joker veya taban kartı atılırsa sıradaki onu alıp çifte
          gidemez, jokere/tabana sorulamaz, çiftçi bile alamaz. Joker ×2 çarpanı yalnızca bitirmek
          için atılan son kart jokersen geçerlidir.
        </p>
        <p>
          Açılmış per veya çiftteki jokeri, temsil ettiği gerçek kartı koyarak alabilirsin.
          Sıralı perde hem perle açan hem çift açan jokeri çekebilir. Erkek perde jokeri kural
          olarak perle açan alır; dördüncü sayı konunca kalan eksiği bir çiftçi de koyabilir.
        </p>

        <AdSlot slot={CONTENT_AD_SLOT} format="horizontal" className="ad-content" />

        <h2>8. El nasıl biter, ceza nasıl yazılır?</h2>
        <p>El şu yollardan biriyle biter:</p>
        <ul>
          <li>
            <strong>Elden bitme:</strong> masada kimse açmamışken tüm perleri bir anda indirip 15.
            kartı atmak.
          </li>
          <li>
            <strong>Perden bitme:</strong> açtıktan sonra kalanı indirip bitmek.
          </li>
          <li>
            <strong>Çiftten bitme:</strong> yedi çift.
          </li>
          <li>
            <strong>Deste bitti:</strong> kimse bitmeden çekme destesi tükendi.
          </li>
        </ul>
        <p>
          Bitiş için puan tabanı yoktur; 51 ile de bitebilirsin. Şart, perleri bir anda
          indirebilmek ve 15. kartı atabilmektir. Masada biri açmışsa «elden bitme» çarpanı
          uygulanmaz.
        </p>
        <h3>Ham ceza tabanı (takımın iki oyuncusu)</h3>
        <ul>
          <li>Açmış (per veya çift) → elde kalan kart puanı (joker 25).</li>
          <li>Çiftçi, henüz açmamış → sabit 200 (100 × 2); elde sayılmaz.</li>
          <li>
            Çiftçi, açmış → elde kalan × 2. Rakip çiftten bitirdiyse kaybeden çiftçinin el cezası
            bir kez daha ×2 (toplam ×4).
          </li>
          <li>Açmamış (çiftçi değil) → sabit 100.</li>
        </ul>
        <h3>Çarpanlar (bitişte, kaybeden tabanına)</h3>
        <ul>
          <li>Elden bitme (masada kimse açmamışsa) → ×2</li>
          <li>Çiftten bitme → ek ×2</li>
          <li>Joker atılarak bitme → ek ×2</li>
        </ul>
        <h3>Kafa (elden bitişte, kaybedene ek)</h3>
        <p>
          Bitirenin ilk açış per toplamı 111–120 ise +100, 121–130 ise +200, 131–140 ise +300,
          141+ ise +400. Altı çift +100, yedi çift +200. Kaybeden takımda biri açmışsa kafa
          yazılmaz. Perden veya çiftten bitişte de kafa yoktur; kafa yalnızca elden bitiştedir.
        </p>
        <p>
          Elden bitişte biten takım 0 sayılır; skora kaybedenin tam ham cezası yazılır. Perden /
          çiftten bitişte fark yazılır. İşlek, ham cezaya eklenir. Destenin kimse bitmeden
          tükenmesinde açan veya çiftçi yoksa herkese 0; varsa hamlar karşılaştırılır.
        </p>

        <h2>9. Masa başı ipuçları</h2>
        <ul>
          <li>
            İlk dört atıkta perle açılamazsın. Erken elde çift biriktirmek veya elden bitiş
            aramak, per yolunu zorlamak kadar geçerlidir.
          </li>
          <li>
            Çiftçi olmak kör bir ceza değildir: atıkları görürsün ve beş çift ile baraj
            beklemeden açabilirsin. Ama işleyemezsin; ortak perine yardım edemezsin.
          </li>
          <li>
            İşlek +71, küçük bir elde kalan puandan pahalıdır. Açıldıktan sonra atacağın kartın
            yerdeki perlere oturup oturmadığına bak.
          </li>
          <li>
            Baraj 101&apos;e çıktıysa perle açmayı ertelemek, rakibin eşiğini yükseltmesine izin
            vermek veya çifte kaymak daha ucuz olabilir.
          </li>
          <li>
            Jokerini bitiş atışı için saklamak ×2 demektir; sıradan bir atık olarak yere bırakmak
            ise kartı «öldürür».
          </li>
        </ul>

        <h2>10. Kısa sözlük</h2>
        <dl className="faq-list">
          <dt>Baraj</dt>
          <dd>Perden açmak için gereken minimum puan: 71 veya (çiftçi / çift sonrası) 101.</dd>
          <dt>Çift</dt>
          <dd>Aynı kartın kırmızı ve mavi kopyası; joker bir eşi tamamlayabilir.</dd>
          <dt>Çiftçi</dt>
          <dd>O elde çift yoluna kilitlenmiş oyuncu. Atıkları görür, perlere işlemez.</dd>
          <dt>İşlek</dt>
          <dd>Yerdeki bir pere gidebilecek atış; atan takıma +71.</dd>
          <dt>Taban</dt>
          <dd>Destenin altına konan görünür kart; çiftte wild işlevi görür.</dd>
          <dt>Kafa</dt>
          <dd>Elden bitişte, bitirenin güçlü açışına göre kaybedene eklenen bonus ceza.</dd>
        </dl>

        <p>
          Site ve geliştirme hakkında <SiteLink href={ROUTES.about}>Hakkında</SiteLink> sayfasına,
          veri kullanımı için <SiteLink href={ROUTES.privacy}>gizlilik politikasına</SiteLink>{' '}
          bakabilirsin.
        </p>
      </article>
    </main>
  );
}
