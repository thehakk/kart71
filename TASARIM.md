# 71 — Tasarım Dokümanı

Web tabanlı, 4 kişilik (2v2), gerçek zamanlı, iskambil kartlarıyla oynanan
"101 Okey" esinli özgün oyun. Eksik oyuncu yerine bot oynar.

> Bu doküman **kural setini + mimariyi + geliştirme yol haritasını** içerir.
> Çekirdek oyun (M0–M8) uygulanmıştır; **M9 (cila)** devam ediyor.

---

## 1. Oyun Özeti

| Özellik | Değer |
|---|---|
| Oyuncu sayısı | 4 (aynı anda zorunlu) |
| Takım | 2v2 (karşılıklı ortaklık) |
| Eksik oyuncu | Basit bot ile tamamlanır |
| El (round) sayısı | 13 el |
| Kazanan | 13 el sonunda **toplam cezası en düşük** takım |
| Platform | Web (tarayıcı) |
| Teknoloji | Node.js + Socket.IO (sunucu) + React (istemci) |

---

## 2. Kart & Deste Modeli

- Toplam **106 kart**.
- **2 deste**: biri **kırmızı sırtlı**, biri **mavi sırtlı**.
  - Her deste: 4 seri (♥ ♦ ♣ ♠) × 13 sıra (A, K, Q, J, 10, 9, 8, 7, 6, 5, 4, 3, 2) = **52 kart**.
  - 2 × 52 = **104** + **2 joker** (1 kırmızı sırtlı, 1 mavi sırtlı) = **106**.
- Sonuç: **her kartın tam 2 kopyası** vardır → biri kırmızı sırtlı, biri mavi sırtlı.
- Sırt rengi, aynı kartın iki kopyasını ayırt etmek için kullanılır (özellikle **çift**te kritik).

### Kart puanları
Açış/baraj hesabı, "kafa" bonusu ve kaybeden **açan** oyuncunun elde kalan puanı için kullanılır:

| Kart | Puan |
|---|---|
| A | 11 |
| K, Q, J (resimliler) | 10 |
| 10 … 2 (rakamlar) | Kendi değeri |
| Joker (elde kalırsa) | 25 |

> Not: Kart puanları **ceza tabanının** kendisi değildir. Ceza; sabit 100 tabanı,
> çarpanlar ve "kafa" bonusuyla hesaplanır (bkz. §8). Kart puanları yalnızca
> açış eşiği, kafa bonusu ve **kaybeden açan oyuncunun** elde kalan puanı için kullanılır.

---

## 3. Kurulum (Deal)

1. Kartlar karılır.
2. **Kesme:** Dağıtandan **önceki** oyuncu desteyi keser.
   - **Kesen jokere denk gelirse** (kesme noktasındaki kart joker ise), o **joker kesen
     oyuncunun** olur. Bu oyuncuya dağıtımda **13 kart** verilir → joker ile toplam **14**.
3. **Taban:** Rastgele bir kart destenin **en altına** konur; buna **taban** denir.
   - Taban masada **görünür** (istemci merkez alanda gösterir).
   - Taban, **çiftte bir eş gibi** kullanılabilir (çift için joker benzeri "wild" işlevi).
     Destede iki kopya olduğu için **tabanla aynı suit+rank** kart (eldeki diğer kopya) da çiftte wild sayılır.
4. **Dağıtım:** Kartlar **2'şer 2'şer** dağıtılır. Her oyuncuya **14 kart** (herkes eşit;
   joker kesen oyuncuya 13 + kestiği joker = 14).
5. Başlayan oyuncu = **dağıtanın üstündeki** oyuncu.
6. Çekme destesinin **en üstteki kartı yere açılır** (açık atık başlangıcı).
7. Kalan kartlar **kapalı çekme destesi** olur (taban en altta).
8. Başlayan oyuncu:
   - Açık kartı **alırsa** → **çiftçi olmadan** başlar, bir kart atar.
   - Beğenmezse → desteden çeker, işe yaramayan bir kartı atar.

---

## 4. Perler (Meld Türleri)

- **Sıralı per** (özel isimsiz): aynı seriden **ardışık** kartlar. Örn. `5♥-6♥-7♥`.
  - A **yalnızca üstte**: `…Q-K-A` geçerli. `A-2-3` **geçersiz**, sarma yok.
- **Erkek per** (grup): aynı sayıdan **farklı serilerden** kartlar. Örn. `7♥-7♦-7♣`.
- **Genel kurallar:**
  - Bir perde **her kart benzersiz** olmalı → aynı kartın iki kopyası (kırmızı 7♥ + mavi 7♥) **aynı perde kullanılamaz**.
  - Bir per **en fazla 5 kart** olabilir (erkek per doğal olarak en fazla 4 seri).
  - Perlerde **joker** (wild) kullanılabilir; yerine geçtiği kartı temsil eder ve o kartın puanını sayar.

---

## 5. Sıra Akışı (Turn Flow)

Sıradaki oyuncu:
1. **Kart alır:** kapalı desteden çeker **veya** son atılan kartı alır (aşağıdaki kurallara göre).
2. **İsteğe bağlı:** açar / işler (kurallara göre).
3. **Bir kart atar** (sıra bir sonraki oyuncuya geçer).

### Atık (discard) & alma kuralları
- Yalnızca **son atılan** kart istenebilir.
- Atık yığınında **en üstteki kart görünür** (altındakiler kapalı).
- Atılan kart, **atan oyuncuya sorulmadan alınamaz.**
  - **Sormadan alan → çiftçi olur.**
  - İstenen kartı **atan vermezse → atan da çiftçi olur.**
  - **Çiftçi olan oyuncu** atığa tıkladığında **sormadan** alır — ancak yalnızca atık
    **eldeki bir çifti tamamlıyorsa** (birebir ikiz; joker/taban wild sayılmaz).
    İşe yaramayan veya **taban/joker** atıkları alamaz.
  - Sırası gelen oyuncu **«Çifte git»** ile atık almadan da çiftçi olabilir (`turn:declareCiftci`).
  - Sorup verilirse alan oyuncu; ya **çifte gider**, ya **perden açar**, ya da **çiftle bitirir**.
    **Perle bitiremez**; bunların hiçbirini yapmadan **kart atarsa çiftçi olur**.
  - **İşlek atık** (masadaki pere giden kart) **sorulamaz**.

### Erken faz (ilk 4 atık)
- El başında **ilk 4 atık** düşene kadar (`discardsMade < 4`):
  - Per **sorulamaz** ve perle **açılamaz**.
  - **Çifte gitme** ve **bitirme** serbesttir.

---

## 6. Çiftçi (Özel Durum)

Bir oyuncu **çiftçi** olur ise (sormadan atık alma, istenen kartı vermeme, «Çifte git»
deklarasyonu veya **çift açma** yoluyla):
- O el **yalnızca çift ile açabilir** ve **çiftten bitebilir**.
- **Atık alma:** çiftçi atığa tıkladığında **sormadan** alır; yalnızca **çiftini tamamlayan**
  atıklar alınabilir (taban/joker hariç).
- Açılmış perlere **işleyemez**.
- Ancak **attığı kart başkası için "işlek"** olabilir.
- Görünürlük: **çifte giden (çiftçi) oyuncu tüm atık kartları görebilir.**
  - **İki takımda da çiftçi varsa → herkes tüm atıkları görür.**
- **Deklarasyon:** Çiftçi olduğunda kalıcı **«çiftçi»** etiketi gösterilir; ilk kez
  çiftçi olunca tek seferlik toast. İsteğe bağlı **«Çifte git»** butonu ile atık
  almadan da çiftçi olunabilir.

---

## 7. Açma, Çift ve İşleme

### 7.1 Perden Açma (Baraj)
- Açış = perlerin yere serilmesi; **açış değeri = serilen kartların puan toplamı**.
- **Baraj (eşik):** normalde **71+**.
  - Masada **çiftçi** veya bir oyuncu **çift** açtıysa, **perden açma barajı 101+**'e yükselir.
  - Baraj yükselmesi, **zaten açmış** oyuncuları **etkilemez**.
- **Escalation:** sonraki açan, **bir önceki açandan yüksek** açmalı.
  - Gerekli açış = `max(baraj, önceki_açan_değeri + 1)`.
  - Örnek 1: A **86** açtı → B perle ≥ **87**.
  - Örnek 2: A **105** açtı, B **5 çift** açtı → C perle ≥ **106** (hem 101+ hem >105).
- Açan oyuncu, açtıktan sonra **işleme** yapabilir.

### 7.2 Çiftten Açma
- **5 çift** ile açılır (**puana bakılmaz**).
- Escalation: sonraki çift açan **6**, sonraki **7** çift açmalı.
  - **7 çift = 14 kart = bitiş** (çiftten bitme).
- **Çift tanımı:** aynı kartın iki kopyası (kırmızı sırtlı + mavi sırtlı, örn. `7♥(K) + 7♥(M)`).
- Çiftte **joker** kullanılabilir (joker + gerçek kart = çift).

### 7.3 İşleme
- **Per'e per işlenir** (yerdeki mevcut perlere kart eklenir).
- Yerdeki **her pere** işlenebilir: kendi, takım arkadaşı ve **rakip** perleri dahil.
- **Yalnızca sıra sendeyken** işlenir.
- İşleme için önce **kendin açmış** olmalısın. **Çiftçi işleyemez.**
- **Aynı turda** birden fazla kağıdı (aynı pere veya farklı perlere) tek seferde işleyebilirsin.
- **İşlek cezası:** Yerde **per açıldıktan sonra**, atılan kart masadaki herhangi bir pere
  işlenebiliyorsa (**işlek atış**), o kartı **atan oyuncunun takımına +71** yazılır (her işlek
  atış için). Elden veya atıktan **işleme** ceza doğurmaz; çifte gitmek de işlek atışı
  engellemez.

### 7.4 Joker / Taban — Atık Kısıtları
- Oyunun herhangi bir yerinde **fiziksel joker veya taban kartı** atılırsa (bitmek için atma **hariç**):
  - Sıradaki oyuncu bu kartı **alıp çifte gidemez**.
  - **Jokere/taban kartına sorulamaz** (istenemez).
  - **Çiftçi olsan bile** bu kartları **alamazsın**.
  - Yani atılan joker/taban pratikte "ölü" olur; **yalnızca bitiş atışı** olarak atılabilir.
- **Not:** Tabanın **diğer kopyası** (aynı suit+rank, farklı sırt) çiftte wild sayılır;
  çiftçi için ayrıca `isTabanLikeCard` kontrolü vardır.
- **Joker ×2 çarpanı** yalnızca joker **bitmek amaçlı** (bitirenin son/15. kartı olarak) atıldığında geçerlidir.

### 7.5 Joker El Değiştirme (Yerdeki jokeri gerçek kartla alma)
Açılmış bir **per** veya **çiftte** joker varsa, jokerin temsil ettiği gerçek kartı
elinde bulunduran oyuncu, sırası geldiğinde kartı koyup jokeri alabilir. Kurallar
perin türüne göre değişir:

- **Sıralı perde joker** (örn. `6♥-[joker=7♥]-8♥`):
  - **Perle açan** oyuncu, elindeki **gerçek 7♥**'yi koyup jokeri alabilir.
  - **Çift açan** oyuncu da elindeki **gerçek 7♥**'yi koyup jokeri alabilir.

- **Erkek perde joker** (örn. `7♣(gerçek)-7♥(gerçek)-[joker]`):
  - Eksik iki 7'yi (♦, ♠) **yalnızca perle açan** koyabildiği için, jokeri **yalnızca perdeki (perle açan)** alabilir.
  - **4. 7 konduktan sonra** (grup tek eksik 7'ye indiğinde), kalan **eksik 7'yi bir çiftçi de koyup** jokeri alabilir.

- **Çiftte joker/taban wild** (örn. `7♥ + [joker]` veya `7♥ + [taban wild]`):
  - **Perdeki (perle açan) oyuncu**, eksik gerçek kartı koyup wild'ı alabilir.
  - **Başka bir çiftçi**, **daha yüksek çift açarak** wild'ı alabilir.

> Taban wild el değiştirme, joker ile aynı mantıkta uygulanır (`swapWildInPair`).

---

## 8. Bitme ve Puanlama

### 8.1 El nasıl biter?
Bir el şu durumlardan biriyle biter:
- Bir oyuncunun **elden bitmesi** (masada **kimse açmamışken**, tüm perleri bir anda indirip 15. kartı atarak),
- **Sonradan perden** bitme (açtıktan sonra kalan perleri indirip bitme),
- **Çiftten** bitme (7 çift),
- **Çekme destesinin tükenmesi** (kimse bitmeden).

**Bitiş için puan limiti yoktur** (51 ile bile bitilebilir); şartlar:
tüm perleri **bir anda indirebilmek** ve **15. kartı atabilmek**.

> Önemli: **Masada biri açmışsa "elden bitme" kavramı düşer**, normal bitişe döner
> (elden ×2 çarpanı uygulanmaz).

### 8.2 Ceza puanı formülü

Her el sonunda iki takımın **ham cezası** hesaplanır; skora yalnızca **fark** yazılır
(bkz. §8.4). Bitiş ve deste-tükendi dalları aynı fark mantığını kullanır.

**Taban (takımın 2 oyuncusu için toplam):**
- **Açmış** (per veya çift; masada görünür) → **elde kalan kartlarının puanı** (joker = 25).
- **Çiftçi, henüz açmamış** → sabit **100 × 2 = 200** (elde kalan sayılmaz).
- **Çiftçi, açmış** (çift indirmiş) → **elde kalan × 2**.
  - Rakip **çiftten** bitirdiyse kaybeden çiftçinin el cezası ek **×2** (toplam ×4).
- **Açmamış** (çiftçi değil) → sabit **100**.

**Çarpanlar (bitişte, kaybeden takım tabanına çarpımsal):**
| Koşul | Çarpan |
|---|---|
| Elden bitme (yalnızca masada kimse açmamışsa) | ×2 |
| Çiftten bitme | ×2 (ilave) |
| Joker atılarak bitme (bitirenin son attığı kart joker) | ×2 (ilave) |

**Kafa (bitiş bonusu — çarpana dahil değil, kaybeden hamına eklenir):**
| Bitirenin açtığı per toplamı | Kafa |
|---|---|
| 111–120 | 100 |
| 121–130 | 200 |
| 131–140 | 300 |
| 141+ | 400 |
| 6 çift | 100 |
| 7 çift | 200 |
| (111 altı / bonussuz) | 0 |

**Kafa istisnası:** Kaybeden takımda **herhangi bir oyuncu açmışsa** (per veya çift),
bitirenin kafa bonusu **eklenmez**. **Perden/çiftten bitişte** kafa da uygulanmaz
(masada zaten açılış vardır); kafa yalnızca **elden bitişte** yazılır.

**Bitiş skoru:**
- **Elden bitiş:** biten takım **0** sayılır; skora kaybedenin **tam ham cezası** yazılır
  (`taban × çarpanlar + kafa + işlek`).
- **Perden/çiftten bitiş:** skora **fark** yazılır (`kaybeden_ham − biten_takım_ham`).
  Perden bitişte biten takım **0** sayılır; çiftten bitişte biten takımın gerçek ham
  cezası düşülür (ör. ortağı açmamışsa 100).

**İşlek:** Atan takıma biriken +71, ham cezaya eklenir.

### 8.3 Örnekler
- **Maksimum örnek:** Elden + çiftten + joker ile 7 çift bitiş, rakip açmamış:
  `taban 200 × 2 × 2 × 2 = 1600`, `+ kafa (7 çift = 200)` = **1800** ham; biten takım 0 → skora **+1800**.
- **Rakip açmadı, normal bitiş:** `200 + kafa` ham fark.
- **Rakip açtı, çiftten bitiş:** örn. kaybeden çiftçi 6 çift açmış, elde 6 puan, partner açmamış:
  `taban = 100 + (6×4) = 124`, `×2 (çiftten) = 248`; biten takım ham 100 → skora **+148**.
- **Deste bitti, hiç açan/çiftçi yok:** herkese **0**.
- **Deste bitti, çiftçi/açan var:** ham cezalar + düşük takımın **kafa** bonusu;
  `yazılan = yüksek_ham + kafa − düşük_ham` (ör. 300 + 300 − 102 = 498).

### 8.4 Skora yazım (her el)
- Her el sonunda iki takımın **ham cezası** (işlek dahil) hesaplanır.
- Skora yalnızca **fark** yazılır: `|yüksek_ham − düşük_ham|` kaybeden takıma.
- Ham cezalar eşitse fark 0; işlek farkı varsa yine yazılabilir.
- 13 el sonunda **toplam cezası en düşük** takım kazanır.

---

## 9. Uygulama Notları (Eski Açık Maddeler — Çözüldü)

Aşağıdaki maddeler kodda uygulanmıştır:

| Konu | Karar |
|---|---|
| Taban görünürlüğü | Taban masada **görünür** (`GameView.taban`). Fiziksel kart deste dibinde; çiftte **taban kartı + aynı suit+rank kopya** wild sayılır. |
| Taban el değiştirme | Joker ile aynı mantık (`swapWildInPair`). |
| Deste tükendi puanlama | `yüksek_ham + kafa − düşük_ham` (`scoring.ts`). |
| Dağıtan rotasyonu | Saat yönünde (`nextDealerSeat`). |
| Erkek/sıralı per | Yalnızca isimlendirme; kural etkisi yok. |
| Joker el değiştirme | §7.5 — uygulandı. |
| Joker ×2 | Yalnızca bitiş atışı. |
| Joker/taban atık | §7.4 — uygulandı. |

**Henüz yapılmayan (M9+):** birim testleri, gelişmiş bot (v2), tam animasyon seti.

---

## 10. Mimari

Gerçek zamanlı 4 oyuncu ⇒ **otoriter (authoritative) sunucu**. Tüm oyun durumu ve
kural doğrulaması sunucuda; istemci yalnızca görünüm + oyuncuya özel state alır.

```
┌────────────────────────────────────────────────────────┐
│                     İstemci (React)                      │
│  - Lobi / oda ekranı                                     │
│  - Masa (el, atık, perler, sıra göstergesi)             │
│  - Aksiyonlar: çek / al / aç / işle / at / bitir        │
│  - Socket.IO client                                      │
└──────────────────────────┬─────────────────────────────┘
                           │  WebSocket (Socket.IO)
┌──────────────────────────┴─────────────────────────────┐
│                 Sunucu (Node.js + Socket.IO)             │
│  - Oda/lobi yönetimi (4 slot, boşları bot doldurur)     │
│  - Oyun motoru (game engine) — kurallar, state machine  │
│  - Kural doğrulayıcı (validator)                        │
│  - Bot motoru (basit, kural bazlı)                      │
│  - Puanlama & el/oyun yönetimi                          │
└─────────────────────────────────────────────────────────┘
```

**Otoriterlik ilkesi:** İstemci asla tam desteyi/rakip ellerini görmez. Sunucu her
oyuncuya yalnızca **görebileceği** state'i (kendi eli, açık perler, atık üstü, sayaçlar,
görünürlük kurallarına göre atıklar) gönderir.

---

## 11. Veri Modeli (Taslak)

```ts
type Suit = 'H' | 'D' | 'C' | 'S';          // ♥ ♦ ♣ ♠
type Rank = 'A'|'K'|'Q'|'J'|'10'|'9'|'8'|'7'|'6'|'5'|'4'|'3'|'2';
type Back = 'red' | 'blue';                  // sırt rengi

interface Card {
  id: string;          // benzersiz (ör. "H7-red")
  suit: Suit | null;   // joker ise null
  rank: Rank | null;   // joker ise null
  back: Back;
  isJoker: boolean;
}

type MeldType = 'run' | 'group';             // sıralı per | erkek per
interface Meld {
  id: string;
  type: MeldType;
  cards: Card[];       // joker dahil olabilir
  ownerSeat: number;   // ilk açan koltuk
}

interface Pair { cards: [Card, Card]; }      // çift (biri joker olabilir)

interface PlayerState {
  seat: 0|1|2|3;
  team: 0 | 1;         // 0-2 aynı takım, 1-3 aynı takım (varsayım)
  isBot: boolean;
  hand: Card[];        // yalnızca sahibine gönderilir
  hasOpened: boolean;
  isCiftci: boolean;
  openedValue: number; // açış toplamı (kafa için)
}

interface HandState {
  drawPile: Card[];            // taban en altta
  taban: Card;                 // çiftte wild eş gibi kullanılabilir
  discardPile: Card[];         // üstü herkese görünür
  melds: Meld[];
  pairsBySeat: Record<number, Pair[]>;
  turnSeat: number;
  perBaraj: 71 | 101;          // çift açılınca 101
  lastOpenerValue: number;     // escalation için
  ciftEscalation: 5 | 6 | 7;
  phase: 'draw' | 'meld' | 'discard' | 'ended';
  pendingDiscardRequest?: { fromSeat: number; toSeat: number; card: Card };
}

interface GameState {
  roomId: string;
  players: PlayerState[];
  dealerSeat: number;
  handNumber: number;          // 1..13
  hand: HandState;
  teamScores: [number, number];
}
```

---

## 12. Socket.IO Event Akışı (Uygulama)

Tüm sunucu → istemci güncellemeleri **`room:update`** ve **`game:update`** üzerinden gider
(ayrı `hand:ended` / `game:ended` event'leri yok; `phase: 'ended'` ve `status: 'finished'`
ile bildirilir).

**İstemci → Sunucu**
| Event | Payload | Açıklama |
|---|---|---|
| `room:join` | `{ code?, name }` | Lobiye katıl veya **oyun devam ederken aynı isimle yeniden bağlan** |
| `room:ready` | `{ ready }` | Hazır |
| `room:fillBots` | — | Boş slotları bot doldur |
| `room:pickSeat` | `{ seat }` | Koltuk seç (lobi) |
| `room:shuffleTeams` | — | Rastgele takımlar |
| `room:leave` | — | Odadan ayrıl (koltuk boşalır) |
| `turn:drawPile` | — | Kapalı desteden çek |
| `turn:takeDiscard` | `{ ask }` | Atığı al (`ask=false` → sormadan, çiftçi) |
| `turn:declareCiftci` | — | Atık almadan çiftçi ol |
| `turn:discard` | `{ cardId }` | Kart at |
| `discard:respond` | `{ give }` | Atık isteğine ver/verme |
| `meld:open` | `{ melds }` | Perlerle aç |
| `meld:lay` | `{ melds }` | Açıldıktan sonra per indir |
| `meld:openPairs` | `{ pairs }` | Çiftle aç |
| `meld:layPairs` | `{ pairs }` | Açıldıktan sonra çift indir |
| `meld:processHand` | `{ meldId, cardIds?, ops? }` | Elden işleme (tek/toplu) |
| `meld:processDiscard` | `{ meldId }` | Atık üstünü işle (işlek) |
| `meld:swapJoker` | `{ meldId, cardId }` | Perde joker al |
| `meld:swapJokerPair` | `{ ownerSeat, pairIndex, cardId }` | Çifte wild al |
| `meld:finish` | `{ melds?, pairs?, discardCardId }` | Bitir |
| `game:continue` | — | Sonraki el |
| `room:playAgain` | — | Lobiye dön |

**Sunucu → İstemci**
| Event | Açıklama |
|---|---|
| `room:update` | Lobi / oyun durumu (`status`, `finalResult`) |
| `game:update` | Oyuncuya özel filtrelenmiş masa (`handResult`, `pending`, `discardAskable`) |
| `error` | `{ message }` — geçersiz hamle |

---

## 13. Bot Mantığı (Basit — M8)

Kural bazlı bot (`server/src/engine/bot.ts`):

1. **El stratejisi:** El **1–3** temkinli (geç aç/çiftçi); **4–10** normal; **11–13** agresif.
2. **Çekme:** Atık işe yarıyorsa al; çiftçi yalnızca **çift tamamlayan** atığı alır.
3. **Açma:** Baraj + escalation sağlanıyorsa aç; kafa (111+ / 6 çift) beklenir.
4. **İşleme:** Açtıysa işlenebilir kart varsa işle.
5. **Atma:** İşlek vermemeye çalış; joker/taban ortada atılmaz (deste kritikse istisna).
6. **Bitirme:** Mümkünse bitir.
7. **Atık verme:** Rakip çifte gidecekse atığı **vermeyebilir** (`shouldBotGiveDiscard`).
8. **Bağlantısı kopan oyuncu:** Sırası gelince bot mantığıyla oynar (M9 reconnect).

> v2 (opsiyonel): olasılık/strateji tabanlı akıllı bot.

---

## 14. Klasör Yapısı (Güncel)

```
71/
├─ TASARIM.md
├─ package.json               # workspaces (server + client)
├─ server/
│  ├─ src/
│  │  ├─ index.ts             # HTTP + Socket.IO bootstrap
│  │  ├─ rooms.ts             # oda/lobi yönetimi
│  │  ├─ shared/types.ts      # paylaşılan tipler + socket event'leri
│  │  └─ engine/
│  │     ├─ deck.ts           # 106 kart, dağıtım, kesme
│  │     ├─ melds.ts          # per/çift doğrulama, wild, atık yardımcıları
│  │     ├─ actions.ts        # tur aksiyonları, çiftçi, işleme, bitiş
│  │     ├─ scoring.ts        # ceza + kafa + fark
│  │     ├─ state.ts          # GameState, görünürlük, baraj
│  │     ├─ turn.ts           # sıra, erken faz
│  │     └─ bot.ts            # basit bot
│  └─ tests/                  # (planlanıyor — M9+)
└─ client/
   ├─ src/
   │  ├─ App.tsx
   │  ├─ socket.ts
   │  ├─ handSort.ts          # otomatik el dizimi
   │  ├─ lib/session.ts       # oda/isim oturumu (M9 reconnect)
   │  └─ components/          # GameTable, CardView, HandResult, Scoreboard...
   └─ index.html
```

---

## 15. Geliştirme Yol Haritası (Milestones)

- **M0 — İskelet:** ✅ Monorepo, Socket.IO, lobi (oda kodu, takım seçimi, bot doldurma).
- **M1 — Deste & dağıtım:** ✅ 106 kart, kesme/joker, taban, 2×2 dağıtım, açık kart.
- **M2 — Temel tur:** ✅ Çek/al/at, bot turu, otomatik el dizimi, responsive UI.
- **M3 — Perler & açma:** ✅ Sıralı/erkek per, baraj 71 + escalation, açma UI.
- **M4 — Çift & çiftçi:** ✅ Çift açma, çiftçi, sorarak alma, atık görünürlüğü, joker/taban kısıtları, erken faz.
- **M5 — İşleme:** ✅ İşleme, işlek cezası, joker/wild el değiştirme, toplu işleme.
- **M6 — Bitme & puanlama:** ✅ Bitiş, ceza formülü, fark yazımı, el sonu özeti.
- **M7 — 13 el & oyun sonu:** ✅ Rotasyon, handHistory, GameOver, playAgain.
- **M8 — Bot:** ✅ El numarasına göre strateji (1–3 temkinli), çiftçi atık seçimi, atık vermeme.
- **M9 — Cila:** 🔄 Devam ediyor
  - [x] TASARIM.md güncel koda senkron
  - [x] Yeniden bağlanma (kopunca koltuk korunur, aynı isimle dönüş; kopuk oyuncu için bot devralır)
  - [x] Bağlantı kopması / yeniden bağlanma UX (localStorage oturumu, banner)
  - [x] Kart animasyonları (hover, seçim, giriş — temel)
  - [ ] Birim testleri (scoring, melds)
  - [ ] İsteğe bağlı: gelişmiş bot v2
