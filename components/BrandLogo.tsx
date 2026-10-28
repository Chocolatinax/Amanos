/** Símbolo oficial de Amanos: mano azul y mano coral con el corazón en el centro. */
export default function BrandSymbol({ className = "h-9 w-auto" }: { className?: string }) {
  const hand = (color: string) => (
    <>
      <g stroke={color} strokeLinecap="round">
        <line x1="82" y1="104" x2="72" y2="26" strokeWidth="26" />
        <line x1="128" y1="106" x2="150" y2="44" strokeWidth="22" />
        <line x1="74" y1="146" x2="26" y2="104" strokeWidth="24" />
      </g>
      <rect x="62" y="92" width="84" height="84" rx="28" fill={color} />
      {/* La separación entre dedos toma el color del fondo, así no queda una línea blanca en modo oscuro. */}
      <rect x="86" y="90" width="20" height="36" rx="10" fill={color} strokeWidth="3" style={{ stroke: "rgb(var(--c-surface-container-lowest, 255 255 255))" }} />
      <rect x="105" y="92" width="20" height="34" rx="10" fill={color} strokeWidth="3" style={{ stroke: "rgb(var(--c-surface-container-lowest, 255 255 255))" }} />
    </>
  );
  return (
    <svg viewBox="55 45 290 185" className={className} aria-hidden="true" focusable="false">
      <g transform="translate(45 50)">{hand("#4977CD")}</g>
      <g transform="translate(355 50) scale(-1 1)">{hand("#EF746D")}</g>
      <path d="M200 82 C197.47 80.31 195.29 78.47 193.45 76.54 C182.2 64.77 183.41 50 192 50 C196 50 200 54 200 58 C200 54 204 50 208 50 C215.14 50 217.18 60.19 211.22 70.39 C208.83 74.48 205.15 78.57 200 82 Z" fill="#FEDA84" />
    </svg>
  );
}
