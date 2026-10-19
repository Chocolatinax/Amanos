"use client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { nextSign, practiceTarget } from "@/lib/nav";
import BrandMark from "./BrandMark";
import Icon from "./Icon";
import { useCatalog } from '@/lib/catalog';

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join("") || "A";
}
export function Avatar({ name, src, size = 32 }: { name: string; src?: string; size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  if (src) return <img src={src} alt={name} width={size} height={size} referrerPolicy="no-referrer" className="rounded-full object-cover ring-2 ring-primary-fixed" style={{ width: size, height: size }} />;
  return <span aria-label={name} className="grid place-items-center rounded-full bg-primary-container font-label-sm text-on-primary ring-2 ring-primary-fixed" style={{ width: size, height: size }}>{initials(name)}</span>;
}

export function useNavTargets() {
  const { progress } = useApp();
  const { signs } = useCatalog();
  const next = nextSign(progress, signs), practice = practiceTarget(progress, signs);
  return { learn: next ? `/app/unidad/${next.unidadId}` : '/app', practice: practice ? `/app/practica/${practice.id}` : '/app' };
}
export const isActive = (path: string, key: string) =>
  key === "inicio" ? path === "/" : key === "ruta" ? path === "/app" :
  key === "aprender" ? path.startsWith("/app/unidad") || path.startsWith("/app/sena") :
  key === "camara" ? path.startsWith("/app/practica") : key === "progreso" ? path.startsWith("/app/progreso") : false;

export function StreakPill({ n }: { n: number }) {
  return (
    <span title="Racha de días" className="inline-flex items-center gap-space-xs rounded-full bg-tertiary-fixed px-space-sm py-space-xs text-on-tertiary-fixed shadow-sm">
      <Icon name="local_fire_department" fill className="text-lg text-tertiary" />
      <span className="font-label-md text-label-md">{n} {n === 1 ? "día" : "días"}</span>
    </span>
  );
}

export default function AppHeader() {
  const { user, stats, progress, logout } = useApp();
  const router = useRouter();
  const path = usePathname();
  const t = useNavTargets();
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (menu.current && !menu.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);

  const items = [
    { key: "inicio", href: "/", label: "Inicio" },
    { key: "ruta", href: "/app", label: "Ruta" },
    { key: "aprender", href: t.learn, label: "Aprender" },
    { key: "camara", href: t.practice, label: "Práctica con Cámara" },
    { key: "progreso", href: "/app/progreso", label: "Progreso" },
  ];
  const paid = progress.plan === "pago";

  return (
    <header style={{ paddingTop: 'env(safe-area-inset-top)' }} className="fixed left-0 right-0 top-0 z-50 w-full bg-surface/90 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-space-md px-margin md:px-margin-tablet lg:px-margin-desktop">
        <BrandMark href={user ? "/app" : "/"} />
        <nav aria-label="Principal" className="hidden items-center gap-space-xs rounded-full bg-surface-container-low p-space-xs lg:flex">
          {items.map(i => (
            <Link key={i.key} href={i.href} aria-current={isActive(path, i.key) ? "page" : undefined}
              className={`rounded-full px-space-md py-space-xs font-label-md text-label-md transition-all ${isActive(path, i.key) ? "bg-primary-container text-on-primary-container" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"}`}>{i.label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-space-sm">
          <StreakPill n={stats.streak} />
          <Link href="/app/paywall" className={`hidden items-center rounded-full px-space-sm py-space-xs font-label-sm text-label-sm transition-all sm:inline-flex ${paid ? "bg-secondary-container text-on-secondary-fixed-variant" : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"}`}>
            {paid ? "Amanos Plus" : "Plan gratis"}
          </Link>
          <div className="relative" ref={menu}>
            <button onClick={() => setOpen(o => !o)} aria-haspopup="menu" aria-expanded={open} aria-label="Menú de cuenta" className="rounded-full">
              <Avatar name={user?.name ?? "Amigo"} src={user?.avatar} />
            </button>
            {open && (
              <div role="menu" className="pop absolute right-0 mt-space-sm w-60 rounded-2xl bg-surface-container-lowest p-space-sm shadow-[0_8px_24px_-4px_rgba(31,99,214,0.18)] ring-1 ring-outline-variant/40">
                <div className="px-space-sm py-space-xs">
                  <div className="truncate font-label-md text-label-md">{user?.name}</div>
                  <div className="truncate font-body-sm text-body-sm text-on-surface-variant">{user?.email}</div>
                </div>
                <div className="my-space-xs h-px bg-outline-variant/40" />
                {user?.isAdmin && <Link role="menuitem" href="/app/admin" className="flex items-center gap-2 rounded-xl px-3 py-3 font-semibold hover:bg-surface-container-low"><Icon name="admin_panel_settings" /> Administrar Amanos</Link>}
                <Link role="menuitem" href="/app/paywall" className="flex items-center gap-space-sm rounded-xl px-space-sm py-space-sm font-label-md text-label-md hover:bg-surface-container-low"><Icon name="workspace_premium" className="text-lg" /> {paid ? "Mi membresía" : "Mejorar a Plus"}</Link>
                <button role="menuitem" onClick={() => { logout(); router.replace("/login"); }} className="flex w-full items-center gap-space-sm rounded-xl px-space-sm py-space-sm font-label-md text-label-md text-error hover:bg-error-container/40"><Icon name="logout" className="text-lg" /> Salir</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

/** Dock inferior en móvil, con el botón central de práctica (DESIGN.md: Navigation Dock). */
export function MobileDock() {
  const path = usePathname();
  const t = useNavTargets();
  const Item = ({ href, icon, label, active }: { href: string; icon: string; label: string; active: boolean }) => (
    <Link href={href} aria-current={active ? "page" : undefined} className={`flex min-w-14 flex-col items-center gap-0.5 py-1 ${active ? "text-primary-container" : "text-on-surface-variant"}`}>
      <Icon name={icon} fill={active} /><span className="font-label-sm text-[11px]">{label}</span>
    </Link>
  );
  return (
    <nav aria-label="Navegación móvil" className="fixed inset-x-0 bottom-[calc(.75rem+env(safe-area-inset-bottom))] z-40 mx-auto flex w-[min(92vw,420px)] items-center justify-between rounded-full bg-surface-container-lowest px-space-md py-space-xs shadow-[0_8px_24px_-4px_rgba(31,99,214,0.22)] ring-1 ring-outline-variant/40 lg:hidden">
      <Item href="/app" icon="home" label="Ruta" active={isActive(path, "ruta")} />
      <Item href={t.learn} icon="school" label="Aprender" active={isActive(path, "aprender")} />
      <Link href={t.practice} aria-label="Práctica con cámara" className="-mt-7 grid h-14 w-14 place-items-center rounded-full bg-primary-container text-on-primary shadow-lg ring-4 ring-surface"><Icon name="photo_camera" fill className="text-[28px]" /></Link>
      <Item href="/app/progreso" icon="monitoring" label="Progreso" active={isActive(path, "progreso")} />
      <Item href="/app/paywall" icon="workspace_premium" label="Plus" active={path.startsWith("/app/paywall")} />
    </nav>
  );
}
