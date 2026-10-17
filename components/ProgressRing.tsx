/** Anillo de progreso genérico (0-100). */
export default function ProgressRing({ value, size = 144, label, tone = "primary" }: { value: number; size?: number; label?: string; tone?: "primary" | "success" }) {
  const stroke = 10, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const v = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={`${v}% ${label ?? ""}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="text-surface-container-high" stroke="currentColor" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)}
          className={tone === "success" ? "text-secondary" : "text-primary-container"} stroke="currentColor" style={{ transition: "stroke-dashoffset .6s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-headline-lg text-headline-lg text-on-surface">{v}%</span>
        {label && <span className="font-label-sm text-label-sm text-on-surface-variant">{label}</span>}
      </div>
    </div>
  );
}
