type LogoProps = {
  size?: number;
  showWordmark?: boolean;
  className?: string;
};

/** Kart 71 marka logosu (SVG). */
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
        <rect x="4" y="8" width="36" height="48" rx="5" fill="#14532d" stroke="#86efac" strokeWidth="2" />
        <rect x="24" y="4" width="36" height="48" rx="5" fill="#15803d" stroke="#bbf7d0" strokeWidth="2" />
        <text
          x="42"
          y="38"
          textAnchor="middle"
          fill="#fef9c3"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontWeight="700"
          fontSize="22"
        >
          71
        </text>
        <path
          d="M12 22h16M12 28h12M12 34h14"
          stroke="#86efac"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.55"
        />
        <circle cx="50" cy="14" r="4" fill="#fbbf24" stroke="#fef3c7" strokeWidth="1.5" />
      </svg>
      {showWordmark && <span className="brand-logo-text">Kart 71</span>}
    </span>
  );
}
