type LogoProps = {
  size?: number;
  showWordmark?: boolean;
  className?: string;
};

/** Kart 71 marka logosu — klasik Jolly Joker. */
export function Logo({ size = 40, showWordmark = true, className = '' }: LogoProps) {
  return (
    <span className={`brand-logo ${className}`.trim()}>
      <img
        className="brand-logo-icon brand-logo-joker"
        src="/jolly-joker.png"
        alt=""
        width={size}
        height={size}
        draggable={false}
        aria-hidden
      />
      {showWordmark && <span className="brand-logo-text">Kart 71</span>}
    </span>
  );
}
