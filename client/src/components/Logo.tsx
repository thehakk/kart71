type LogoProps = {
  size?: number;
  showWordmark?: boolean;
  className?: string;
};

function JokerCardIcon() {
  return (
    <>
      <defs>
        <linearGradient id="joker-card-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="55%" stopColor="#fcd34d" />
          <stop offset="100%" stopColor="#fca5a5" />
        </linearGradient>
        <linearGradient id="joker-star-fill" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <g transform="rotate(-8 32 32)">
        <rect x="14" y="8" width="36" height="48" rx="6" fill="url(#joker-card-bg)" stroke="#7c2d12" strokeWidth="2" />
        <rect x="17" y="11" width="30" height="42" rx="4" fill="none" stroke="#7c2d12" strokeWidth="0.75" opacity="0.35" />
        <text x="20" y="20" fill="#7c2d12" fontSize="9" fontWeight="700" fontFamily="system-ui, sans-serif">
          J
        </text>
        <text x="44" y="52" fill="#7c2d12" fontSize="9" fontWeight="700" fontFamily="system-ui, sans-serif" transform="rotate(180 44 52)">
          J
        </text>
        <path
          d="M32 24l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L32 38.5l-5.6 2.9 1.1-6.2-4.5-4.4 6.2-.9L32 24z"
          fill="url(#joker-star-fill)"
          stroke="#92400e"
          strokeWidth="0.75"
        />
        <text
          x="32"
          y="47"
          textAnchor="middle"
          fill="#7c2d12"
          fontSize="6.5"
          fontWeight="800"
          letterSpacing="1.2"
          fontFamily="system-ui, sans-serif"
        >
          JOKER
        </text>
      </g>
    </>
  );
}

/** Kart 71 marka logosu — joker karti. */
export function Logo({ size = 36, showWordmark = true, className = '' }: LogoProps) {
  return (
    <span className={`brand-logo ${className}`.trim()} style={{ ['--logo-size' as string]: `${size}px` }}>
      <svg
        className="brand-logo-icon"
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <JokerCardIcon />
      </svg>
      {showWordmark && <span className="brand-logo-text">Kart 71</span>}
    </span>
  );
}
