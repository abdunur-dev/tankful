const BODY_TOP = 120;
const BODY_BOTTOM = 370;
const level = (fraction: number) => BODY_BOTTOM - fraction * (BODY_BOTTOM - BODY_TOP);

const BODY = "M140 120 H307 Q325 120 325 138 V352 Q325 370 307 370 H113 Q95 370 95 352 V165 Z";
const HANDLE = "M150 70 H262 V120 H150 Z M168 84 H244 V106 H168 Z";

export function HeroArt({ className = "" }: { className?: string }) {
  const fuel = level(0.68);
  const low = level(0.3);
  const critical = level(0.1);

  return (
    <svg viewBox="0 0 440 420" className={className} role="img" aria-label="A fuel can, about two-thirds full">
      <defs>
        <pattern id="dots" width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="1.35" fill="#fff" />
        </pattern>
        <clipPath id="can">
          <path d={BODY} />
          <path d={HANDLE} clipRule="evenodd" />
          <rect x="270" y="88" width="40" height="32" />
        </clipPath>
        <linearGradient id="shade" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.65" />
        </linearGradient>
      </defs>

      <g clipPath="url(#can)">
        <rect x="0" y="0" width="440" height="420" fill="url(#dots)" opacity="0.18" />
        <rect x="0" y={fuel} width="440" height={420 - fuel} fill="url(#dots)" opacity="0.95" />
        <rect x="0" y={fuel} width="440" height="2" fill="#fff" />
        <path d="M128 162 L292 336 M292 162 L128 336" stroke="#000" strokeWidth="12" opacity="0.55" />
        <rect x="0" y="0" width="440" height="420" fill="url(#shade)" />
      </g>

      <g fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.25">
        <path d={BODY} />
        <path d={HANDLE} />
        <rect x="270" y="88" width="40" height="32" />
      </g>

      <g fontFamily="var(--font-geist-mono), monospace" fontSize="10" letterSpacing="1">
        <line x1="325" x2="345" y1={fuel} y2={fuel} stroke="#fff" />
        <text x="350" y={fuel + 3.5} fill="#fff">FUEL 68%</text>
        <line x1="325" x2="345" y1={low} y2={low} stroke="#a1a1aa" strokeDasharray="2 2" />
        <text x="350" y={low + 3.5} fill="#a1a1aa">LOW 30%</text>
        <line x1="325" x2="345" y1={critical} y2={critical} stroke="#71717a" strokeDasharray="2 2" />
        <text x="350" y={critical + 3.5} fill="#71717a">CRIT 10%</text>
      </g>
    </svg>
  );
}
