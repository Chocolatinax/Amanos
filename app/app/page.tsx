"use client";
import Link from "next/link";
import Icon from "@/components/Icon";
import ProgressRing from "@/components/ProgressRing";
import SignVideo from "@/components/SignVideo";
import { dailyChallenge } from "@/lib/daily";
import { nextSign } from "@/lib/nav";
import { useCatalog } from "@/lib/catalog";
import { useApp } from "@/lib/store";
import { XP_MASTERED } from "@/lib/gamification";

const TIPO: Record<string, string> = { estatica: "Seña estática", dinamica: "Con movimiento", ubicacion: "Con ubicación" };
const SOON = [
  { icon: "restaurant", title: "Comida típica", tag: "Cultura" },
  { icon: "family_restroom", title: "Familia y relaciones", tag: "Cultura" },
  { icon: "map", title: "Lugares de El Salvador", tag: "Cultura" },
];

export default function Dashboard() {
  const { signs: SIGNS, units: UNITS, getUnit } = useCatalog();
  const { user, stats, progress, resetProgress, mode } = useApp();
  const next = nextSign(progress, SIGNS);
  if (!next) return <div className="p-6">Todavía no hay señas publicadas.</div>;
  const unit = getUnit(next.unidadId)!;
  const unitDone = unit.signIds.filter(id => progress.signs[id]?.mastered).length;
  const unitPct = Math.round((unitDone / unit.signIds.length) * 100);
  const idxInUnit = unit.signIds.indexOf(next.id) + 1;
  const challenge = dailyChallenge(progress, undefined, SIGNS);
  const remaining = Math.max(0, stats.dailyGoal - stats.todayCount);
  const goalPct = Math.min(100, Math.round((stats.todayCount / stats.dailyGoal) * 100));
  const allDone = stats.mastered === SIGNS.length;
  const paid = progress.plan === "pago";
  const first = (user?.name ?? "").split(" ")[0] || "amigo";
  const evaluable = next.tipo === "estatica";

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-space-xl px-margin py-space-lg md:px-margin-tablet lg:px-margin-desktop">
      {/* Saludo y métricas del día */}
      <section className="relative flex flex-col justify-between gap-space-lg overflow-hidden rounded-xl bg-surface-container-lowest p-space-lg shadow-sm md:p-space-xl lg:flex-row lg:items-center">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 top-1/2 h-60 w-60 rounded-full bg-tertiary/10 blur-3xl" />
        <div className="relative z-10 flex max-w-xl flex-col">
          <div className="mb-space-xs inline-flex items-center gap-space-xs font-label-sm text-label-sm uppercase tracking-wider text-primary">
            <span className="h-2 w-2 animate-pulse rounded-full bg-secondary" /> Panel de aprendizaje diario
          </div>
          <h1 className="mb-space-xs font-headline-xl-mobile text-headline-xl-mobile tracking-tight text-on-surface md:font-headline-xl md:text-headline-xl">¡Hola, {first}! 👋</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            {remaining === 0 ? "¡Cumpliste tu meta de hoy! Cada seña extra suma a tu racha y a tu XP." : `Te ${remaining === 1 ? "falta" : "faltan"} ${remaining} ${remaining === 1 ? "seña" : "señas"} para cumplir tu meta de hoy. ¡Dale con todo!`}
          </p>
        </div>
        <div className="relative z-10 flex shrink-0 flex-wrap items-center gap-space-sm sm:flex-nowrap">
          <div className="flex items-center gap-space-sm rounded-xl bg-tertiary-fixed/80 px-space-md py-space-sm text-on-tertiary-fixed shadow-sm">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-tertiary-container/30"><Icon name="local_fire_department" fill className="text-2xl text-tertiary" /></div>
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm uppercase leading-none text-on-tertiary-fixed-variant">Racha</span>
              <span className="font-label-lg text-label-lg font-bold leading-tight">{stats.streak} {stats.streak === 1 ? "día" : "días"} seguidos</span>
            </div>
          </div>
          <div className="flex min-w-[190px] flex-col justify-center rounded-xl bg-surface-container-low px-space-md py-space-sm">
            <div className="mb-space-xs flex items-center justify-between gap-space-xs">
              <span className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant"><Icon name="verified" className="text-sm text-secondary" /> Meta diaria</span>
              <span className="font-label-sm text-label-sm font-bold text-secondary">{Math.min(stats.todayCount, stats.dailyGoal)}/{stats.dailyGoal} señas</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-container-high"><div className="h-full rounded-full bg-secondary transition-all duration-700" style={{ width: `${goalPct}%` }} /></div>
          </div>
          <div className="flex items-center gap-space-xs rounded-xl bg-surface-container-high p-1.5">
            <span className="hidden px-space-sm font-label-sm text-label-sm text-on-surface-variant md:inline">{paid ? "Plus activo" : "Plan gratis"}</span>
            {!paid && <Link href="/app/paywall" className="flex items-center gap-space-xs rounded-lg bg-gradient-to-r from-primary to-primary-container px-space-md py-space-sm font-label-md text-label-md text-on-primary shadow-md transition-all hover:scale-[1.02] hover:shadow-lg active:scale-95"><Icon name="star" fill className="text-lg" /> Mejorar a Plus</Link>}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-space-lg lg:grid-cols-12">
        {/* Continuar donde quedaste */}
        <section className="group flex flex-col overflow-hidden rounded-xl bg-surface-container-lowest shadow-lg lg:col-span-7">
          <div className="h-2 w-full bg-gradient-to-r from-primary via-primary-container to-secondary-container" />
          <div className="flex flex-col gap-space-md p-space-lg md:p-space-xl">
            <div className="flex flex-wrap items-center justify-between gap-space-xs">
              <div className="inline-flex items-center gap-space-xs rounded-full bg-primary-fixed px-space-sm py-1 font-label-sm text-label-sm text-on-primary-fixed"><Icon name={allDone ? "replay" : "play_arrow"} className="text-base" />{allDone ? "Repasá lo aprendido" : "Continuar donde quedaste"}</div>
              <span className="font-label-sm text-label-sm font-medium text-on-surface-variant">{unit.nombre.split(":")[0]} • Seña {idxInUnit} de {unit.signIds.length}</span>
            </div>
            <div className="my-space-xs flex flex-col items-center gap-space-lg sm:flex-row">
              <div className="relative h-56 w-full shrink-0 overflow-hidden rounded-xl bg-surface-container-low sm:w-56">
                <SignVideo sign={next} ratio="none" fit="cover" className="h-full w-full !rounded-xl" />
                <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-inverse-surface/80 via-transparent to-transparent p-space-sm text-inverse-on-surface">
                  <div className="flex items-center gap-space-xs"><Icon name="gesture" className="text-sm text-secondary-container" /><span className="font-label-sm text-label-sm font-semibold">{TIPO[next.tipo]}</span></div>
                </div>
              </div>
              <div className="flex w-full flex-1 flex-col justify-center gap-space-sm">
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md font-bold uppercase tracking-wider text-primary">{allDone ? "Para repasar" : "Siguiente seña"}</span>
                  <h2 className="font-headline-lg text-headline-lg text-on-surface">{next.significado.toLowerCase().includes(next.glosa.toLowerCase()) ? next.significado : <>{next.significado} <span className="text-on-surface-variant">· {next.glosa}</span></>}</h2>
                  <p className="mt-1 font-body-md text-body-md text-on-surface-variant">{next.descripcion.configuracionMano}.</p>
                </div>
                <div className="flex items-center gap-space-md py-space-xs font-label-sm text-label-sm text-on-surface-variant">
                  <span className="flex items-center gap-1"><Icon name={evaluable ? "photo_camera" : "school"} className="text-sm text-primary" />{evaluable ? "Se califica con la cámara" : "Práctica guiada"}</span>
                </div>
                <div className="flex items-center gap-space-sm pt-space-xs">
                  <Link href={`/app/sena/${next.id}`} className="btn-push-primary flex-1 sm:flex-none"><Icon name="sign_language" /> {progress.signs[next.id]?.seen ? "Seguir con la seña" : "Ver la seña"}</Link>
                  <Link href={`/app/unidad/${unit.id}`} title="Ver la unidad" aria-label="Ver la unidad" className="grid h-12 w-12 place-items-center rounded-xl bg-surface-container text-on-surface transition-colors hover:bg-surface-container-high"><Icon name="map" /></Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-space-lg lg:col-span-5">
          <section className="relative flex flex-col gap-space-md overflow-hidden rounded-xl bg-surface-container-lowest p-space-lg shadow-md">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-space-xs rounded-full bg-tertiary-fixed px-space-sm py-1 font-label-sm text-label-sm text-on-tertiary-fixed"><Icon name="military_tech" className="text-base" /> Reto del día</span>
              <span className="font-label-sm text-label-sm font-bold text-tertiary">{challenge.review ? "Repaso" : `+${XP_MASTERED} XP`}</span>
            </div>
            <div className="flex items-start gap-space-md">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-tertiary-fixed/60 text-tertiary"><Icon name="target" fill className="text-3xl" /></div>
              <div className="flex flex-col">
                <h3 className="font-headline-sm text-headline-sm text-on-surface">{challenge.review ? "Repasá" : "Dominá"} “{challenge.sign.glosa}”</h3>
                <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">{challenge.sign.tipo === "estatica" ? "Hacé la seña frente a tu cámara y sostenela un segundo con buena similitud." : "Mirá el video y ensayá el movimiento. Esta seña todavía no se califica automáticamente."}</p>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-surface-container-low p-space-sm pt-space-xs">
              <span className="flex items-center gap-space-xs font-label-sm text-label-sm text-on-surface"><Icon name={challenge.sign.tipo === "estatica" ? "videocam" : "visibility"} className="text-lg text-secondary" />{challenge.sign.tipo === "estatica" ? "Usa la cámara" : "Práctica guiada"}</span>
              <Link href={challenge.sign.tipo === "estatica" ? `/app/practica/${challenge.sign.id}` : `/app/sena/${challenge.sign.id}`} className="rounded-lg bg-surface-container-highest px-space-md py-space-xs font-label-sm text-label-sm text-on-surface transition-colors hover:bg-surface-container">Iniciar reto</Link>
            </div>
          </section>
          <div className="flex items-center gap-space-md rounded-xl bg-surface-container-low p-space-md">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-fixed text-on-primary-fixed"><Icon name="lightbulb" className="text-xl" /></div>
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm font-bold text-primary">Tip de práctica</span>
              <p className="font-body-sm text-body-sm leading-snug text-on-surface-variant">En las lenguas de señas el rostro y el cuerpo también son parte de la seña. Mirá el video completo, no solo las manos.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Unidad activa */}
      <section className="flex flex-col gap-space-md">
        <div className="flex flex-col justify-between gap-space-xs sm:flex-row sm:items-end">
          <div>
            <span className="font-label-sm text-label-sm font-bold uppercase tracking-wider text-primary">Tu ruta de aprendizaje</span>
            <h2 className="font-headline-lg text-headline-lg text-on-surface">{unit.nombre}</h2>
          </div>
          <div className="flex items-center gap-space-sm">
            <span className="font-label-md text-label-md text-on-surface-variant">Progreso de la unidad:</span>
            <span className="font-headline-sm text-headline-sm text-primary">{unitPct}%</span>
          </div>
        </div>
        <div className="grid grid-cols-1 items-center gap-space-xl rounded-xl bg-surface-container-lowest p-space-lg shadow-md md:p-space-xl lg:grid-cols-12">
          <div className="flex flex-col items-center justify-center rounded-xl bg-surface-container-low p-space-md text-center lg:col-span-4">
            <div className="my-space-xs"><ProgressRing value={unitPct} label="Completado" /></div>
            <p className="mt-space-sm font-label-md text-label-md font-semibold text-on-surface">{unitDone} de {unit.signIds.length} señas dominadas</p>
            <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">{unit.descripcion}</p>
          </div>
          <div className="flex flex-col gap-space-sm lg:col-span-8">
            {unit.signIds.map(id => {
              const s = SIGNS.find(x => x.id === id)!;
              const sp = progress.signs[id];
              const done = !!sp?.mastered;
              const current = !done && id === next.id;
              return (
                <Link key={id} href={`/app/sena/${id}`} className={`flex items-center justify-between gap-space-md rounded-xl p-space-md transition-colors ${current ? "bg-surface-container-lowest ring-2 ring-primary-container" : "bg-surface-container-low/70 hover:bg-surface-container-low"}`}>
                  <div className="flex items-center gap-space-md">
                    <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${done ? "bg-secondary-container text-on-secondary-container" : current ? "bg-primary-fixed text-primary" : "bg-surface-container text-on-surface-variant"}`}>
                      <Icon name={done ? "check" : current ? "play_arrow" : sp?.seen ? "visibility" : "arrow_forward"} fill={current} className="text-2xl" />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex flex-wrap items-center gap-space-xs">
                        <span className="font-label-lg text-label-lg font-bold text-on-surface">{s.glosa}</span>
                        {done && <span className="rounded bg-secondary-container px-space-xs py-0.5 font-label-sm text-xs text-on-secondary-container">Dominada · {sp.bestScore}%</span>}
                        {current && <span className="rounded bg-primary-fixed px-space-xs py-0.5 font-label-sm text-xs text-on-primary-fixed">Siguiente</span>}
                      </div>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">{s.significado} · {TIPO[s.tipo]}</span>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-lg px-space-md py-space-xs font-label-sm text-label-sm ${current ? "bg-primary-container text-on-primary" : "bg-surface-container-high text-on-surface"}`}>{done ? "Repasar" : current ? "Continuar" : "Ver"}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Todas las unidades + próximamente */}
      <section className="flex flex-col gap-space-md">
        <div className="flex items-end justify-between">
          <div>
            <span className="font-label-sm text-label-sm font-bold uppercase tracking-wider text-primary">Vocabulario</span>
            <h2 className="font-headline-lg text-headline-lg text-on-surface">Todas las unidades</h2>
          </div>
          <Link href="/app/progreso" className="flex items-center font-label-md text-label-md text-primary">Ver progreso <Icon name="chevron_right" className="text-lg" /></Link>
        </div>
        <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-4">
          {UNITS.map(u => {
            const done = u.signIds.filter(id => progress.signs[id]?.mastered).length;
            return (
              <Link key={u.id} href={`/app/unidad/${u.id}`} className="card-surface flex flex-col gap-space-sm p-space-md transition-shadow hover:shadow-[0_8px_24px_-4px_rgba(73,119,205,0.18)]">
                <span className="font-label-sm text-label-sm uppercase text-on-surface-variant">Unidad {u.id}</span>
                <span className="font-headline-sm text-headline-sm">{u.nombre.replace(/^Unidad \d+: /, "")}</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">{u.descripcion}</span>
                <div className="mt-auto flex items-center gap-space-sm pt-space-xs">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-container-high"><div className="h-full rounded-full bg-secondary" style={{ width: `${(done / u.signIds.length) * 100}%` }} /></div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">{done}/{u.signIds.length}</span>
                </div>
              </Link>
            );
          })}
        </div>
        <div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
          {SOON.map(m => (
            <div key={m.title} className="flex items-center gap-space-md rounded-xl bg-surface-container-low p-space-md opacity-80">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-surface-container text-on-surface-variant"><Icon name={m.icon} /></div>
              <div className="flex flex-col"><span className="font-label-lg text-label-lg">{m.title}</span><span className="font-body-sm text-body-sm text-on-surface-variant">{m.tag} · Próximamente</span></div>
              <Icon name="lock" className="ml-auto text-outline" />
            </div>
          ))}
        </div>
      </section>

      <button onClick={async () => { if (confirm("¿Reiniciar todo tu progreso?")) { await resetProgress(); location.reload(); } }} className="self-start font-label-sm text-label-sm text-outline hover:text-on-surface-variant">
        Reiniciar progreso ({mode === "api" ? "servidor" : "demo"})
      </button>
    </div>
  );
}
