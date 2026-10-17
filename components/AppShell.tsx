"use client";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { useApp } from "@/lib/store";
import AppHeader, { MobileDock } from "./AppHeader";
import Footer from "./Footer";
import Icon from "./Icon";

/** Marco de las pantallas privadas: exige sesión, muestra cabecera, dock móvil y pie. */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const { ready, user, syncError } = useApp();
  const router = useRouter();
  const path = usePathname();
  const immersive = path.startsWith("/app/practica"); // cámara a pantalla completa: sin dock ni pie

  useEffect(() => { if (ready && !user) router.replace("/login"); }, [ready, user, router]);

  if (!ready || !user) return <div className="grid min-h-dvh place-items-center text-on-surface-variant">Cargando…</div>;

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader />
      <main className={`w-full pt-16 ${immersive ? "" : "pb-24 lg:pb-0"}`}>
        {syncError && (
          <div role="status" className="mx-auto flex max-w-3xl items-center gap-space-sm bg-tertiary-fixed px-space-md py-space-sm font-body-sm text-body-sm text-on-tertiary-fixed sm:rounded-b-xl">
            <Icon name="cloud_off" className="text-lg" /> Sin conexión con el servidor. Tu avance se guarda en este dispositivo.
          </div>
        )}
        {children}
      </main>
      {!immersive && <Footer />}
      {!immersive && <MobileDock />}
    </div>
  );
}
