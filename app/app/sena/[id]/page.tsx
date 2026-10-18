"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import SignVideo from "@/components/SignVideo";
import { MOVEMENT_CHECK_IDS } from "@/lib/movement-check";
import { CAMERA_EVALUATED_IDS } from "@/lib/human-evaluator";
import { getSign, getUnit, SIGNS } from "@/lib/signs";
import { useApp } from "@/lib/store";

const TIPO = { estatica: "Seña estática", dinamica: "Seña con movimiento", ubicacion: "Estática con ubicación" } as const;
const MOVIMIENTO = {
  estatica: "Seña estática: mantené la mano quieta, sin balanceos.",
  dinamica: "Seña con movimiento: seguí el recorrido que se ve en el avatar, de principio a fin.",
  ubicacion: "Seña estática: lo que importa es dónde se ubica la mano respecto al cuerpo.",
} as const;

export default function SignPage() {
  const { id } = useParams<{ id: string }>();
  const sign = getSign(id);
  const { progress, markSeen } = useApp();
  const [copied, setCopied] = useState(false);
  useEffect(() => { if (sign) markSeen(sign.id); }, [sign, markSeen]);

  if (!sign) return <div className="mx-auto max-w-3xl p-margin"><p>Seña no encontrada.</p><Link href="/app" className="text-primary underline">Volver al panel</Link></div>;

  const unit = getUnit(sign.unidadId);
  const idx = SIGNS.findIndex(s => s.id === sign.id);
  const prev = SIGNS[idx - 1], next = SIGNS[idx + 1];
  const sp = progress.signs[sign.id];
  const evaluable = CAMERA_EVALUATED_IDS.includes(sign.id);
  const movementOnly = MOVEMENT_CHECK_IDS.includes(sign.id);
  const share = async () => {
    const url = location.href;
    try { if (navigator.share) await navigator.share({ title: `Amanos · ${sign.glosa}`, url }); else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); } } catch {}
  };

  const steps = [
    { n: "01", icon: "back_hand", title: "Forma de la mano", text: sign.descripcion.configuracionMano },
    { n: "02", icon: "screen_rotation", title: "Orientación", text: sign.descripcion.orientacion },
    { n: "03", icon: "open_with", title: "Movimiento", text: MOVIMIENTO[sign.tipo] },
    { n: "04", icon: "my_location", title: "Ubicación", text: sign.descripcion.ubicacion },
  ];

  return (
    <div className="pb-40 lg:pb-28">
      <section className="mx-auto w-full max-w-6xl px-margin py-space-md md:px-margin-tablet lg:px-margin-desktop">
        <div className="flex items-center justify-between gap-space-sm rounded-full bg-surface-container-low px-space-md py-space-sm shadow-sm">
          <Link href={`/app/unidad/${sign.unidadId}`} className="group inline-flex items-center gap-space-xs text-on-surface transition-colors hover:text-primary">
            <Icon name="arrow_back" className="text-xl text-primary transition-transform group-hover:-translate-x-1" />
            <span className="font-label-md text-label-md">Volver a Unidad {sign.unidadId}</span>
          </Link>
          <div className="hidden items-center gap-space-xs sm:flex">
            <span className="rounded-full bg-primary-fixed px-space-sm py-space-xs font-label-sm text-label-sm uppercase tracking-wide text-on-primary-fixed">{unit?.nombre.replace(/^Unidad \d+: /, "")}</span>
            <span className="h-1.5 w-1.5 rounded-full bg-outline-variant" />
            <span className="font-label-sm text-label-sm text-on-surface-variant">{idx + 1} de {SIGNS.length}</span>
          </div>
          <button onClick={share} aria-label="Compartir seña" className="relative grid h-10 w-10 place-items-center rounded-full bg-surface text-on-surface shadow-sm transition-all hover:bg-surface-container active:scale-95">
            <Icon name={copied ? "check" : "share"} className="text-xl" />
            {copied && <span role="status" className="absolute -bottom-8 right-0 whitespace-nowrap rounded bg-inverse-surface px-2 py-1 font-label-sm text-xs text-inverse-on-surface">Enlace copiado</span>}
          </button>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-margin py-space-sm md:px-margin-tablet lg:px-margin-desktop">
        <div className="grid grid-cols-1 items-start gap-space-lg lg:grid-cols-12">
          <div className="flex flex-col gap-space-md lg:col-span-7">
            <SignVideo sign={sign} variant="full" ratio="16 / 10" className="!rounded-[24px] shadow-xl" />
            <p className="px-space-sm font-body-sm text-body-sm text-on-surface-variant">
              Material del equipo · {sign.id === "hola" ? "avatar de referencia" : `página ${sign.pagina ?? "12–20"}`}. <span className="text-outline">Validado por señante nativo: pendiente.</span>
            </p>
          </div>
          <div className="flex flex-col gap-space-md lg:col-span-5">
            <div className="card-surface flex flex-col gap-space-sm p-space-lg">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-secondary-container px-space-sm py-0.5 font-label-sm text-label-sm uppercase text-on-secondary-fixed-variant">{TIPO[sign.tipo]}</span>
                {sp?.mastered && <span className="flex items-center gap-1 font-label-sm text-label-sm text-secondary"><Icon name="verified" fill className="text-base" /> Dominada · {sp.bestScore}%</span>}
              </div>
              <h1 className="font-headline-xl-mobile text-headline-xl-mobile tracking-tight text-on-surface md:font-headline-xl md:text-headline-xl">{sign.glosa}</h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant">{sign.significado}. {sign.descripcion.configuracionMano}.</p>
              <div className="mt-space-xs flex flex-wrap gap-space-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-space-sm py-1 font-label-sm text-label-sm text-on-surface-variant"><Icon name="location_on" className="text-sm" />{sign.descripcion.ubicacion}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-space-sm py-1 font-label-sm text-label-sm text-on-surface-variant"><Icon name={evaluable ? "photo_camera" : "school"} className="text-sm" />{evaluable ? "Se califica con cámara" : movementOnly ? "Comprobación de movimiento con cámara" : "Práctica guiada"}</span>
              </div>
            </div>
            {!evaluable && (
              <div className="flex gap-space-sm rounded-xl bg-tertiary-fixed/60 p-space-md text-on-tertiary-fixed">
                <Icon name="info" className="text-tertiary" />
                <p className="font-body-sm text-body-sm">{movementOnly ? (sign.id === "gracias" ? "La cámara comprueba el recorrido de ambas manos y muestra los puntos que debés corregir. La forma de los dedos aún requiere revisión; esta comprobación no marca la seña como dominada." : "La cámara comprueba la ubicación de las muñecas y que sostengás el contacto un segundo. Los dedos ocultos aún requieren revisión; esta comprobación no marca la seña como dominada.") : <>Con la cámara podés ensayar esta seña, pero todavía no se califica ni se marca como dominada: requiere evaluar {sign.tipo === "dinamica" ? "el movimiento completo" : "la ubicación respecto al cuerpo"}.</>}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-space-xl w-full max-w-6xl px-margin md:px-margin-tablet lg:px-margin-desktop">
        <span className="flex items-center gap-space-xs font-label-sm text-label-sm uppercase text-primary"><span className="h-0.5 w-6 bg-primary" /> Paso a paso guiado</span>
        <h2 className="mt-1 font-headline-lg text-headline-lg">¿Cómo hacer la seña?</h2>
        <p className="mt-1 font-body-md text-body-md text-on-surface-variant">Seguí estos cuatro pasos con tu mano dominante y compará con el avatar.</p>
        <div className="mt-space-md grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(s => (
            <div key={s.n} className="card-surface flex flex-col gap-space-sm p-space-md">
              <div className="flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface-container text-primary"><Icon name={s.icon} /></span>
                <span className="font-headline-sm text-headline-sm text-outline-variant">{s.n}</span>
              </div>
              <h3 className="font-label-lg text-label-lg">{s.title}</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-space-xl w-full max-w-6xl px-margin md:px-margin-tablet lg:px-margin-desktop">
        <div className="rounded-xl bg-surface-container-low p-space-md md:p-space-lg">
          <h2 className="flex items-center gap-space-sm font-headline-sm text-headline-sm"><Icon name="warning" className="text-tertiary" /> Cuidado con estos errores comunes</h2>
          {sign.erroresComunes.length > 0 ? (
            <div className="mt-space-md grid grid-cols-1 gap-gutter md:grid-cols-3">
              {sign.erroresComunes.map((e, i) => (
                <div key={e} className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
                  <span className="rounded bg-tertiary-fixed px-space-xs py-0.5 font-label-sm text-xs text-on-tertiary-fixed">Error #{i + 1}</span>
                  <p className="mt-space-xs font-body-sm text-body-sm text-on-surface-variant">{e}.</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-space-sm font-body-sm text-body-sm text-on-surface-variant">Los errores comunes de esta seña se van a agregar cuando los revise una persona que domine LESSA.</p>
          )}
        </div>
      </section>

      <section className="mx-auto mt-space-lg w-full max-w-6xl px-margin md:px-margin-tablet lg:px-margin-desktop">
        <div className="card-surface flex flex-col items-start justify-between gap-space-md p-space-lg sm:flex-row sm:items-center">
          <div className="flex items-center gap-space-md">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-primary-fixed text-primary"><Icon name="spellcheck" /></span>
            <div><h2 className="font-headline-sm text-headline-sm">¿Listo para ponerte a prueba?</h2><p className="font-body-sm text-body-sm text-on-surface-variant">Repasá la forma de la mano frente a un espejo antes de activar la cámara.</p></div>
          </div>
          <div className="flex gap-space-sm">
            {prev && <Link href={`/app/sena/${prev.id}`} className="rounded-full bg-surface-container px-space-md py-space-sm font-label-md text-label-md hover:bg-surface-container-high">← {prev.glosa}</Link>}
            {next && <Link href={`/app/sena/${next.id}`} className="rounded-full bg-surface-container px-space-md py-space-sm font-label-md text-label-md hover:bg-surface-container-high">{next.glosa} →</Link>}
          </div>
        </div>
      </section>

      {/* Barra de acción fija */}
      <div className="fixed inset-x-0 bottom-20 z-30 px-margin lg:bottom-0 lg:pb-space-md">
        <div className="mx-auto flex max-w-6xl items-center gap-space-md">
          <Link href={`/app/practica/${sign.id}`} className="btn-push-primary h-14 flex-1 shadow-lg"><Icon name="videocam" /> {evaluable || movementOnly ? "Practicar con cámara" : "Práctica guiada con cámara"} <Icon name="arrow_forward" /></Link>
        </div>
      </div>
    </div>
  );
}
