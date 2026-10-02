// Ikona "FortiClient skonfigurowany" — uproszczona rekonstrukcja tarczy z siatką (wersja z
// public/forticlient.svg), bez tła, ostra w każdym rozmiarze. Id gradientów mają prefiks
// "fc-icon-", bo ikona występuje w tabeli wiele razy na jednej stronie.
export function ForticlientIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      role="img"
      aria-label="FortiClient"
      className="inline-block shrink-0 align-text-bottom"
    >
      <title>FortiClient</title>
      <defs>
        <linearGradient id="fc-icon-blue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3fa7ee" />
          <stop offset="1" stopColor="#1578c8" />
        </linearGradient>
        <linearGradient id="fc-icon-rim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2f97e6" />
          <stop offset="1" stopColor="#1a78c6" />
        </linearGradient>
        <path
          id="fc-icon-shield"
          d="M128 6C92 24 54 31 22 31V112C22 178 68 222 128 250C188 222 234 178 234 112V31C202 31 164 24 128 6Z"
        />
      </defs>
      <use href="#fc-icon-shield" fill="url(#fc-icon-rim)" />
      <use href="#fc-icon-shield" fill="#ffffff" transform="translate(128 130) scale(0.93) translate(-128 -130)" />
      <use href="#fc-icon-shield" fill="url(#fc-icon-blue)" transform="translate(128 134) scale(0.78) translate(-128 -134)" />
      <g fill="#ffffff">
        <rect x="70" y="72" width="34" height="22" rx="8" />
        <rect x="111" y="72" width="34" height="22" rx="4" />
        <rect x="152" y="72" width="34" height="22" rx="8" />
        <rect x="70" y="101" width="34" height="22" rx="4" />
        <rect x="152" y="101" width="34" height="22" rx="4" />
        <rect x="70" y="130" width="34" height="22" rx="8" />
        <rect x="111" y="130" width="34" height="22" rx="4" />
        <rect x="152" y="130" width="34" height="22" rx="8" />
      </g>
    </svg>
  );
}
