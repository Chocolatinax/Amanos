import Link from "next/link";
import Icon from "./Icon";

export default function BrandMark({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-space-sm" aria-label="Amanos, ir al inicio">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-fixed text-primary"><Icon name="sign_language" fill className="text-[22px]" /></span>
      <span className="flex flex-col">
        <span className="font-headline-sm text-headline-sm leading-none tracking-tight text-primary">Amanos</span>
        {!compact && <span className="mt-space-xs hidden font-label-sm text-label-sm leading-none text-on-surface-variant sm:inline">LESSA El Salvador</span>}
      </span>
    </Link>
  );
}
