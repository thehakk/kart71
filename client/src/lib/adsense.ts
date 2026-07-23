declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

export function getAdSenseClient(): string | undefined {
  const client = import.meta.env.VITE_ADSENSE_CLIENT?.trim();
  return client || undefined;
}

export function isAdSenseEnabled(): boolean {
  return Boolean(getAdSenseClient());
}

let scriptRequested = false;

/** AdSense scriptini bir kez yukler (VITE_ADSENSE_CLIENT tanimliysa). */
export function ensureAdSenseScript(): void {
  const client = getAdSenseClient();
  if (!client || typeof document === 'undefined') return;
  if (scriptRequested || document.querySelector('script[src*="adsbygoogle.js"]')) return;
  scriptRequested = true;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
  script.crossOrigin = 'anonymous';
  script.dataset.kart71Adsense = 'true';
  document.head.appendChild(script);
}

export function pushAdSlot(): void {
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch {
    // Script henuz hazir degilse sessizce gec
  }
}
