import { useEffect, useRef } from 'react';
import { ensureAdSenseScript, getAdSenseClient, pushAdSlot } from '../lib/adsense';

type AdSlotProps = {
  /** AdSense reklam birimi slot ID (orn. 1234567890) */
  slot?: string;
  format?: 'auto' | 'rectangle' | 'horizontal' | 'vertical';
  layout?: string;
  className?: string;
  label?: string;
};

/**
 * AdSense reklam alani. VITE_ADSENSE_CLIENT ve slot tanimli degilse render etmez.
 * Oyun sirasinda kullanilmamali — lobi / el arasi ekranlar icin.
 */
export function AdSlot({
  slot,
  format = 'auto',
  layout,
  className = '',
  label = 'Reklam',
}: AdSlotProps) {
  const client = getAdSenseClient();
  const insRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    if (!client || !slot) return;
    ensureAdSenseScript();
    const el = insRef.current;
    if (!el || el.getAttribute('data-adsbygoogle-status')) return;
    pushAdSlot();
  }, [client, slot]);

  if (!client || !slot) return null;

  return (
    <aside className={`ad-slot ${className}`.trim()} aria-label={label}>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format={format}
        {...(layout ? { 'data-ad-layout': layout } : {})}
        data-full-width-responsive="true"
      />
    </aside>
  );
}
