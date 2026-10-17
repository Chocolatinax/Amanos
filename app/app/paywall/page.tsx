"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Icon from "@/components/Icon";
import { getPlan, PLANS } from "@/lib/plans";
import { useApp } from "@/lib/store";
import type { PlanId } from "@/lib/types";

const PLUS = [
  { b: "Corrección por cámara en tiempo real", t: "con el % de similitud de cada seña." },
  { b: "Práctica con cámara sin límites", t: "para repetir cuantas veces necesités." },
  { b: "Seguimiento detallado", t: "de tu progreso, XP y semanas de práctica." },
  { b: "Módulos culturales", t: "(comida, familia, lugares de El Salvador) apenas estén listos." },
  { b: "Modo sin conexión", t: "para practicar donde no hay internet (en desarrollo)." },
];
const FREE = ["Todas las lecciones y el vocabulario", "Práctica sin corrección", "Racha, XP y progreso básico"];
const FAQ = [
  { q: "¿Puedo cancelar en cualquier momento?", a: "Sí. Cancelás desde esta misma pantalla, sin penalizaciones. En esta demo la cancelación es inmediata." },
  { q: "¿Qué incluye el plan gratis?", a: "Las lecciones y el vocabulario completos, práctica sin corrección, tu racha y tu progreso. Lo que se paga es la corrección por cámara." },
  { q: "¿Cómo se paga?", a: "Todavía no cobramos nada: esta versión es una demo. Cuando abramos los pagos te avisamos antes de cualquier cobro." },
];

function Paywall() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const { progress, setPlan } = useApp();
  const [planId, setPlanId] = useState<PlanId>("mensual");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const plan = getPlan(planId);
  const paid = progress.plan === "pago";
  const current = progress.planId ? getPlan(progress.planId) : null;

  const run = async (id: PlanId | null) => {
    setBusy(true); setError(null);
    try { await setPlan(id); if (id) router.replace(next ? `/app/practica/${next}` : "/app"); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo completar la acción."); }
    finally { setBusy(false); }
  };

  return (
    <div className="relative w-full overflow-hidden pb-space-xl">
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[340px] w-[720px] -translate-x-1/2 rounded-full bg-primary-fixed-dim/30 blur-3xl" />
      <div className="mx-auto flex max-w-4xl flex-col items-center px-margin pt-space-lg text-center md:px-margin-tablet">
        <div className="inline-flex items-center gap-space-xs rounded-full bg-primary-fixed px-space-md py-space-xs text-on-primary-fixed shadow-sm">
          <Icon name="star" fill className="text-base text-primary" /><span className="font-label-sm text-label-sm uppercase tracking-wider">Amanos Plus</span>
        </div>
        <h1 className="mt-space-md max-w-2xl font-headline-xl-mobile text-headline-xl-mobile tracking-tight md:font-headline-xl md:text-headline-xl">Seguí aprendiendo con Amanos Plus</h1>
        <p className="mt-space-sm max-w-xl font-body-lg text-body-lg text-on-surface-variant">Corregí tus señas con la cámara y practicá todo lo que quieras. Las lecciones y el vocabulario son gratis siempre.</p>

        <div className="mt-space-lg inline-flex items-center gap-1 rounded-full bg-surface-container p-1 shadow-inner" role="tablist" aria-label="Frecuencia de pago">
          {PLANS.map(p => (
            <button key={p.id} role="tab" aria-selected={planId === p.id} onClick={() => setPlanId(p.id)}
              className={`flex items-center gap-space-xs rounded-full px-space-md py-space-xs font-label-md text-label-md transition-all ${planId === p.id ? "bg-surface-container-lowest text-on-surface shadow-sm" : "text-on-surface-variant hover:text-on-surface"}`}>
              {p.nombre}{p.etiqueta && <span className="rounded-full bg-secondary-container px-2 py-0.5 text-label-sm font-bold text-on-secondary-fixed-variant">{p.etiqueta}</span>}
            </button>
          ))}
        </div>

        <div className="relative mt-space-lg w-full max-w-xl rounded-3xl bg-gradient-to-b from-primary-container via-surface-container-high to-surface-container p-1 shadow-2xl">
          <div className="flex flex-col rounded-[22px] bg-surface-container-lowest p-space-md text-left md:p-space-xl">
            <div className="flex items-center justify-between gap-space-sm">
              <span className="rounded-full bg-primary-fixed px-space-sm py-space-xs font-label-sm text-label-sm font-bold uppercase tracking-wide text-on-primary-fixed">{paid ? "Tu plan actual" : "Cancelá cuando quieras"}</span>
              <span className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant"><Icon name="lock_open" className="text-sm" /> Demo, sin cobro</span>
            </div>
            <div className="mt-space-md flex items-baseline gap-2">
              <span className="font-headline-xl text-headline-xl font-extrabold">${plan.precio}</span>
              <span className="font-body-md text-body-md font-medium text-on-surface-variant">/ {plan.intervalo}</span>
            </div>
            {planId === "anual" && <p className="font-body-sm text-body-sm font-semibold text-secondary">Equivale a $3.75 al mes. Te ahorrás $15 frente al plan mensual.</p>}

            <ul className="mt-space-lg flex flex-col gap-space-sm">
              {PLUS.map(f => (
                <li key={f.b} className="flex items-start gap-space-sm">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-secondary-container"><Icon name="check" className="text-base font-bold text-secondary" /></span>
                  <p className="font-body-md text-body-md"><strong>{f.b}</strong> {f.t}</p>
                </li>
              ))}
            </ul>

            <div className="mt-space-lg flex flex-col gap-space-sm">
              {paid ? (
                <>
                  <p className="rounded-xl bg-secondary-container/40 px-space-md py-space-sm text-center font-label-md text-label-md text-on-secondary-fixed-variant">Plus activo{current ? ` · plan ${current.nombre.toLowerCase()}` : ""}</p>
                  {current?.id !== planId && <button disabled={busy} onClick={() => run(planId)} className="btn-push-primary h-14 w-full">Cambiar a {plan.nombre.toLowerCase()} (${plan.precio}/{plan.intervalo === "mes" ? "mes" : "año"})</button>}
                  <button disabled={busy} onClick={() => run(null)} className="btn-push-ghost w-full">Cancelar suscripción</button>
                </>
              ) : (
                <>
                  <button disabled={busy} onClick={() => run(planId)} className="btn-push-primary h-14 w-full">{busy ? "Activando…" : <>Activar por ${plan.precio}/{plan.intervalo === "mes" ? "mes" : "año"} <Icon name="arrow_forward" className="text-lg" /></>}</button>
                  <Link href="/app" className="py-space-xs text-center font-label-md text-label-md text-on-surface-variant hover:text-on-surface">Quizás después</Link>
                </>
              )}
              {error && <p role="alert" className="rounded-lg bg-error-container px-space-md py-space-sm font-body-sm text-body-sm text-on-error-container">{error}</p>}
            </div>

            <div className="mt-space-md rounded-xl bg-surface-container-low p-space-sm">
              <p className="mb-space-xs font-label-sm text-label-sm uppercase text-on-surface-variant">Siempre gratis</p>
              <ul className="flex flex-col gap-1">{FREE.map(f => <li key={f} className="flex items-center gap-space-xs font-body-sm text-body-sm text-on-surface-variant"><Icon name="check_circle" fill className="text-base text-secondary" />{f}</li>)}</ul>
            </div>
          </div>
        </div>

        <div className="mb-space-lg mt-space-xl flex w-full max-w-xl flex-col gap-space-sm text-left">
          <h2 className="mb-space-xs text-center font-headline-sm text-headline-sm">Preguntas frecuentes</h2>
          {FAQ.map(f => (
            <details key={f.q} className="group cursor-pointer rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
              <summary className="flex list-none items-center justify-between font-label-lg text-label-lg">{f.q}<Icon name="expand_more" className="transition-transform duration-200 group-open:rotate-180" /></summary>
              <p className="mt-space-xs font-body-sm text-body-sm leading-relaxed text-on-surface-variant">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
export default function Page() { return <Suspense><Paywall /></Suspense>; }
