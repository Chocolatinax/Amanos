"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import Icon from "@/components/Icon";
import { XP_MASTERED, XP_SEEN } from "@/lib/gamification";
import { useCatalog } from "@/lib/catalog";
import { useApp } from "@/lib/store";

const OFFSETS = [0, -56, 56, 0, -56, 40, -24, 48]; // zigzag del camino (px)

export default function UnitPage() {
  const { units: UNITS, getSign, getUnit } = useCatalog();
  const { id } = useParams<{ id: string }>();
  const unit = getUnit(id);
  const { progress } = useApp();
  if (!unit) return <div className="mx-auto max-w-3xl p-margin"><p>Unidad no encontrada.</p><Link href="/app" className="text-primary underline">Volver al panel</Link></div>;

  const signs = unit.signIds.map(i => getSign(i)!);
  const done = signs.filter(s => progress.signs[s.id]?.mastered).length;
  const pct = Math.round((done / signs.length) * 100);
  const currentId = signs.find(s => !progress.signs[s.id]?.mastered)?.id;
  const reward = signs.length * (XP_SEEN + XP_MASTERED);
  const nextUnit = UNITS[UNITS.findIndex(u => u.id === unit.id) + 1];

  return (
    <div className="mx-auto w-full max-w-3xl px-margin pb-space-xl pt-space-md md:px-margin-tablet">
      <div className="mb-space-md flex items-center justify-between gap-space-sm">
        <Link href="/app" className="flex items-center gap-space-xs font-label-md text-label-md text-on-surface-variant hover:text-on-surface"><Icon name="arrow_back" className="text-lg" /> Volver al panel</Link>
        <div className="flex gap-space-xs overflow-x-auto" role="tablist" aria-label="Unidades">
          {UNITS.map(u => (
            <Link key={u.id} href={`/app/unidad/${u.id}`} role="tab" aria-selected={u.id === unit.id}
              className={`whitespace-nowrap rounded-full px-space-md py-space-xs font-label-sm text-label-sm ${u.id === unit.id ? "bg-primary-container text-on-primary" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}>Unidad {u.id}</Link>
          ))}
        </div>
      </div>

      <section className="card-surface flex flex-col gap-space-md p-space-lg sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <span className="flex items-center gap-1 font-label-sm text-label-sm uppercase text-primary"><Icon name="school" className="text-base" /> Unidad {unit.id}</span>
          <h1 className="mt-1 font-headline-lg text-headline-lg">{unit.nombre.replace(/^Unidad \d+: /, "")}</h1>
          <p className="mt-1 font-body-md text-body-md text-on-surface-variant">{unit.descripcion}</p>
          <div className="mt-space-md">
            <div className="mb-1 flex justify-between font-label-sm text-label-sm text-on-surface-variant"><span>{done} de {signs.length} señas dominadas</span><span className="font-bold text-secondary">{pct}% completado</span></div>
            <div className="h-2.5 overflow-hidden rounded-full bg-surface-container-high"><div className="h-full rounded-full bg-secondary transition-all duration-700" style={{ width: `${pct}%` }} /></div>
          </div>
        </div>
        <div className="flex items-center gap-space-sm rounded-xl bg-tertiary-fixed/60 px-space-md py-space-sm text-on-tertiary-fixed">
          <Icon name="bolt" fill className="text-3xl text-tertiary" />
          <div className="flex flex-col"><span className="font-label-sm text-label-sm uppercase">Recompensa</span><span className="font-label-lg text-label-lg">+{reward} XP</span><span className="font-body-sm text-xs text-on-tertiary-fixed-variant">al dominar la unidad</span></div>
        </div>
      </section>

      <ol className="relative mt-space-xl flex flex-col items-center gap-space-lg" aria-label="Camino de la unidad">
        {signs.map((s, i) => {
          const sp = progress.signs[s.id];
          const mastered = !!sp?.mastered;
          const current = s.id === currentId;
          const tone = mastered ? "bg-secondary text-on-secondary" : current ? "bg-primary-container text-on-primary" : sp?.seen ? "bg-primary-fixed text-primary" : "bg-surface-container-lowest text-primary ring-2 ring-primary-fixed";
          return (
            <li key={s.id} className="relative z-10 flex flex-col items-center" style={{ transform: `translateX(${OFFSETS[i % OFFSETS.length]}px)` }}>
              <Link href={`/app/sena/${s.id}`} aria-label={`${s.glosa}: ${mastered ? "dominada" : current ? "tu turno" : "pendiente"}`} className="group relative flex flex-col items-center">
                <span className={`relative grid h-[72px] w-[72px] place-items-center rounded-full shadow-md transition-transform group-hover:scale-105 ${tone} ${current ? "halo" : ""}`}>
                  <Icon name={mastered ? "check" : current ? "star" : "sign_language"} fill={mastered || current} className="relative text-3xl" />
                  {mastered && <span className="absolute -bottom-2 -right-3 rounded-full bg-surface-container-lowest px-2 py-0.5 font-label-sm text-[11px] text-secondary shadow ring-1 ring-secondary-container">{sp.bestScore}%</span>}
                </span>
                <span className="mt-space-sm max-w-[200px] text-center font-label-lg text-label-lg">{s.glosa}</span>
                <span className={`font-label-sm text-label-sm ${mastered ? "text-secondary" : current ? "text-primary" : "text-on-surface-variant"}`}>
                  {mastered ? "Dominada" : current ? "¡Tu turno!" : sp?.seen ? "Vista" : "Pendiente"}
                </span>
              </Link>
              {current && (
                <div className="pop mt-space-sm w-64 rounded-xl bg-surface-container-lowest p-space-md shadow-[0_8px_24px_-4px_rgba(31,99,214,0.18)] ring-1 ring-primary-fixed">
                  <div className="flex items-center justify-between"><span className="font-label-md text-label-md">{s.significado}</span><span className="rounded bg-primary-container px-2 py-0.5 font-label-sm text-[11px] text-on-primary">LESSA</span></div>
                  <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">{s.descripcion.configuracionMano}.</p>
                  <Link href={s.tipo === "estatica" ? `/app/practica/${s.id}` : `/app/sena/${s.id}`} className="mt-space-sm inline-flex items-center gap-1 font-label-sm text-label-sm text-primary">
                    {s.tipo === "estatica" ? "Abrir la cámara" : "Ver la lección"} <Icon name="arrow_forward" className="text-sm" />
                  </Link>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <section className="card-surface mt-space-xl flex flex-col items-start gap-space-sm p-space-lg sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-headline-sm text-headline-sm">{pct === 100 ? "¡Unidad completa! 🎉" : "Seguí a tu ritmo"}</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">{pct === 100 ? "Ya podés pasar a la siguiente unidad." : "Podés abrir cualquier seña del camino; las dominadas se guardan solas."}</p>
        </div>
        {nextUnit && <Link href={`/app/unidad/${nextUnit.id}`} className="btn-push-primary">{nextUnit.nombre.split(":")[0]} <Icon name="arrow_forward" /></Link>}
      </section>
    </div>
  );
}
