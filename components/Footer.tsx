import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-space-xl w-full bg-surface-container-lowest shadow-[0_-1px_6px_rgba(0,0,0,0.03)]">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-space-md px-margin py-space-xl md:flex-row md:px-margin-tablet lg:px-margin-desktop">
        <div className="flex items-center gap-space-sm text-center md:text-left">
          <span className="font-headline-sm text-headline-sm text-primary">Amanos</span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">Micro-aprendizaje de la Lengua de Señas Salvadoreña (LESSA)</span>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-space-lg">
          <Link href="/app" className="font-label-md text-label-md text-on-surface-variant transition-colors hover:text-on-surface">Ruta</Link>
          <Link href="/app/progreso" className="font-label-md text-label-md text-on-surface-variant transition-colors hover:text-on-surface">Progreso</Link>
          <Link href="/app/paywall" className="font-label-md text-label-md text-on-surface-variant transition-colors hover:text-on-surface">Membresía Plus</Link>
        </nav>
        <div className="text-center font-body-sm text-body-sm text-on-surface-variant md:text-right">© {new Date().getFullYear()} Amanos. Proyecto en desarrollo.</div>
      </div>
    </footer>
  );
}
