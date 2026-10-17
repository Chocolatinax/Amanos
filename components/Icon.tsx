/** Material Symbols Outlined (fuente local, ver app/layout.tsx). `fill` rellena el glifo. */
export default function Icon({ name, fill = false, className = "", size }: { name: string; fill?: boolean; className?: string; size?: number }) {
  return (
    <span aria-hidden="true" className={`material-symbols-outlined select-none ${className}`}
      style={{ fontVariationSettings: `'FILL' ${fill ? 1 : 0}`, ...(size ? { fontSize: size } : {}) }}>{name}</span>
  );
}
