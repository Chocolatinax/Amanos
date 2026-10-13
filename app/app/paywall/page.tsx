"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useProgress } from "@/components/AppShell";
import { setPlan } from "@/lib/progress";

function Paywall() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [p, setP] = useProgress();
  if (!p) return null;
  const activate = () => { setP(setPlan("pago")); router.replace(next ? `/app/practica/${next}` : "/app"); };
  const cancel = () => { setP(setPlan("gratis")); };
  return (
    <div className="mx-auto max-w-md space-y-5">
      <h1 className="text-3xl font-black">Desbloqueá la corrección por cámara</h1>
      <p className="text-slate-600">Las lecciones y el vocabulario son gratis siempre. La cámara que valida cada seña al 90% es lo que se paga.</p>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="card">
          <div className="font-bold">Gratis</div>
          <div className="text-3xl font-black">$0</div>
          <ul className="mt-3 space-y-1 text-sm text-slate-600"><li>✅ Todas las lecciones</li><li>✅ Práctica sin corrección</li><li>✅ Racha y progreso</li><li>📷 Cámara en 3 señas de prueba</li></ul>
        </div>
        <div className="card ring-2 ring-brand-500">
          <div className="font-bold text-brand-700">Amanos</div>
          <div className="text-3xl font-black">$5 <span className="text-base font-semibold text-slate-500">/ mes</span></div>
          <ul className="mt-3 space-y-1 text-sm text-slate-600"><li>✅ Todo lo del plan gratis</li><li>📷 Corrección por cámara en las 100 señas</li><li>📈 % de precisión por seña</li></ul>
          {p.plan === "pago" ? (
            <button onClick={cancel} className="btn-ghost mt-4 w-full">Cancelar suscripción</button>
          ) : (
            <button onClick={activate} className="btn-primary mt-4 w-full">Activar por $5/mes</button>
          )}
        </div>
      </div>
      <p className="text-xs text-slate-400">Demo: no se cobra nada. En producción esto abre el checkout de Stripe.</p>
    </div>
  );
}
export default function Page() { return <Suspense><Paywall /></Suspense>; }
