// Ikona "w domenie" — sam symbol (cztery kafelki) z oficjalnego logotypu Microsoft Active
// Directory dostarczonego przez użytkownika, bez towarzyszącego napisu "Active Directory"
// (za szeroki na komórkę tabeli) i bez białego tła — czysty SVG, ostry w każdym rozmiarze.
export function DomainIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 159 158"
      role="img"
      aria-label="W domenie"
      className="inline-block shrink-0 align-text-bottom"
    >
      <title>W domenie</title>
      <g transform="translate(0 -33.561)" fill="#00aaf2">
        <path d="M158.6 154.2v33.3c0 3.9-1.2 4.7-4.9 4.1-24.8-3.7-49.9-7.1-74.9-10.6-4.5-.6-6.1-2.2-6.1-7.1.4-17.7.2-35.5 0-53.4 0-3.9 1.2-5.1 5.1-5.1 25.6.2 50.8.2 75.9.2 4.1 0 5.1 1.6 5.1 5.3-.4 11.2-.2 22.2-.2 33.3z" />
        <path d="M116.1 109.2c-12.6 0-25.2-.2-37.8 0-3.9 0-5.5-.8-5.5-5.3.2-18.1.2-35.9 0-53.8 0-3.5 1.2-4.7 4.5-5.3 25.8-3.7 51.6-7.3 77.4-11.2 4.5-.6 3.7 2.4 3.7 4.9 0 16 .2 32.3 0 48.3 0 5.9-.2 11.8 0 17.7.2 3.7-1.2 4.7-4.7 4.7-12.4-.2-25 0-37.6 0z" />
        <path d="M32.7 115.9h28.2c3 0 4.3 1 4.3 4.1v55.6c0 3.2-1.4 3.5-4.3 3.2-18.7-2.8-37.4-5.5-56-8.1-3.7-.6-4.9-1.8-4.9-5.7.2-14.8.2-29.6 0-44.7 0-3.7 1-4.7 4.7-4.7 9.5.3 18.6.3 28 .3z" />
        <path d="M32.7 109.2H4.9c-3.5 0-4.7-1.2-4.7-4.9.2-14.6.2-29.2 0-43.9 0-3.5 1-4.7 4.7-5.3 18.7-2.4 37.4-5.1 56-8.1 4.3-.6 4.7.8 4.7 4.3v53.2c0 3.9-1.6 4.5-5.1 4.5-9.3 0-18.7.2-27.8.2z" />
      </g>
    </svg>
  );
}
