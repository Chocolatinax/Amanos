import Link from "next/link";
import BrandMark from "./BrandMark";

export default function PublicHeader() {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 w-full bg-surface/90 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-space-md px-margin md:px-margin-tablet lg:px-margin-desktop">
        <BrandMark />
        <nav aria-label="Principal" className="hidden items-center gap-space-lg md:flex">
          <a href="#como" className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface">Cómo funciona</a>
          <a href="#vocabulario" className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface">Vocabulario</a>
          <a href="#waitlist" className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface">Lista de espera</a>
        </nav>
        <div className="flex items-center gap-space-sm">
          <Link href="/login" className="rounded-full px-space-md py-space-xs font-label-md text-label-md text-on-surface hover:bg-surface-container">Entrar</Link>
          <Link href="/login" className="btn-push-primary hidden h-10 !px-space-md sm:inline-flex">Empezar gratis</Link>
        </div>
      </div>
    </header>
  );
}
