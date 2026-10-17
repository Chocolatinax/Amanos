/** Anillo de similitud 0-100. Cobalto mientras se acerca, verde al llegar al umbral. */
export default function ScoreRing({ value, size = 120, threshold = 90, label = "similitud", stroke = 10 }: { value: number; size?: number; threshold?: number; label?: string; stroke?: number }) {
  const r = (size - stroke - 2) / 2, c = 2 * Math.PI * r;
  const ok = value >= threshold;
  const color = ok ? "#006e2d" : "#1f63d6";
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={`${value}% de ${label}`}>
      <svg width={size} height={size} className="absolute inset-0">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#e2e7ff" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(100, Math.max(0, value)) / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset .15s linear, stroke .3s" }} />
      </svg>
      <div className="text-center leading-none">
        <div className="font-headline-sm font-extrabold" style={{ fontSize: size * 0.27, color }}>{value}%</div>
        {label && <div className="mt-1 font-label-sm uppercase text-on-surface-variant" style={{ fontSize: Math.max(9, size * 0.085) }}>{label}</div>}
      </div>
    </div>
  );
}
