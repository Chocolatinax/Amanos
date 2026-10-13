export default function ScoreRing({ value, size = 120, threshold = 90 }: { value: number; size?: number; threshold?: number }) {
  const r = (size - 12) / 2, c = 2 * Math.PI * r;
  const color = value >= threshold ? "#16a34a" : value >= 60 ? "#f59e0b" : "#2f7cf6";
  return (
    <svg width={size} height={size} className="block">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#e2e8f0" strokeWidth="10" fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth="10" fill="none" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset .15s linear, stroke .3s" }} />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize={size * 0.26} fontWeight="700" fill="#0f172a">{value}%</text>
    </svg>
  );
}
