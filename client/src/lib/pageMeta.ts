import { ROUTES } from './routing';

const DEFAULT_TITLE = 'Kart 71 — Online 2v2 Kart Oyunu';
const DEFAULT_DESC =
  'Kart 71: tarayıcıda ücretsiz oynanan 4 kişilik (2v2) iskambil oyunu. Oda aç, arkadaşlarını davet et veya botlarla 13 el oyna. Kayıt gerekmez.';

const META: Record<string, { title: string; description: string }> = {
  [ROUTES.home]: {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESC,
  },
  [ROUTES.rules]: {
    title: 'Kart 71 Nasıl Oynanır? Kurallar, Puanlama ve İpuçları',
    description:
      'Kart 71 kuralları: deste, per, çift, çiftçi, 71/101 açış barajı, işlek cezası, 13 el puanlama ve bitiş. Başlangıç rehberi ve strateji notları.',
  },
  [ROUTES.about]: {
    title: 'Hakkında — Kart 71',
    description:
      'Kart 71 nedir, kim geliştirdi, neden ücretsiz oynanır ve site nasıl çalışır? Bağımsız bir online iskambil oyunu hakkında.',
  },
  [ROUTES.privacy]: {
    title: 'Gizlilik Politikası — Kart 71',
    description:
      'Kart 71 gizlilik politikası: toplanan veriler, çerezler, Google AdSense, oturum bilgisi ve haklarınız.',
  },
  [ROUTES.contact]: {
    title: 'İletişim — Kart 71',
    description:
      'Kart 71 iletişim: kural soruları, hata bildirimi ve gizlilik talepleri için yazın.',
  },
};

export function getPageMeta(path: string): { title: string; description: string } {
  return META[path] ?? {
    title: 'Sayfa bulunamadı — Kart 71',
    description: DEFAULT_DESC,
  };
}

export function applyPageMeta(path: string): void {
  const meta = getPageMeta(path);
  document.title = meta.title;

  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute('content', meta.description);

  const canonicalHref = `https://kart71.vercel.app${path === '/' ? '/' : path}`;
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', canonicalHref);

  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', meta.title);
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute('content', meta.description);
  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) ogUrl.setAttribute('content', canonicalHref);
}
