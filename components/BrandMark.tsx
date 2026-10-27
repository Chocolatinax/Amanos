import Link from "next/link";
import BrandSymbol from "./BrandLogo";

export default function BrandMark({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-space-sm" aria-label="Amanos, ir al inicio">
      <BrandSymbol className="h-9 w-auto" />
      <span className="flex flex-col">
        <span className="font-brand text-[24px] font-black leading-none tracking-[-0.01em] text-amanos-blue">amanos</span>
        {!compact && <span className="mt-space-xs hidden font-label-sm text-label-sm leading-none text-on-surface-variant sm:inline">LESSA El Salvador</span>}
      </span>
    </Link>
  );
}
