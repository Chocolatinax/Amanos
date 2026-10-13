"use client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getUser, logout, type User } from "@/lib/auth";
import { loadProgress, type Progress } from "@/lib/progress";

export function useProgress() {
  const [p, setP] = useState<Progress | null>(null);
  useEffect(() => { setP(loadProgress()); }, []);
  return [p, setP] as const;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [progress] = useProgress();

  useEffect(() => {
    const u = getUser();
    if (!u) router.replace("/login"); else setUser(u);
  }, [router, pathname]);

  if (!user) return <div className="grid min-h-dvh place-items-center text-slate-500">Cargando…</div>;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/app" className="flex items-center gap-2 font-bold text-brand-600">
            <span className="text-xl">✌🏻</span> Amanos
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span title="Racha" className="rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-700">🔥 {progress?.streak ?? 0}</span>
            <Link href="/app/paywall" className={`rounded-full px-3 py-1 font-semibold ${progress?.plan === "pago" ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"}`}>
              {progress?.plan === "pago" ? "Plan $5/mes" : "Gratis"}
            </Link>
            <button onClick={() => { logout(); router.replace("/login"); }} className="text-slate-500 hover:text-slate-800">Salir</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}
