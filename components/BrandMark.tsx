import Link from "next/link";
import BrandSymbol from "./BrandLogo";

export default function BrandMark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-space-sm" aria-label="Amanos, ir al inicio">
      <BrandSymbol className="h-9 w-auto" />
      <span className="font-brand text-[24px] font-black leading-none tracking-[-0.01em] text-amanos-blue">amanos</span>
    </Link>
  );
}
