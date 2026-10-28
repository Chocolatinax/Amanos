"use client";
import Link from "next/link";
import { useState } from "react";
import Icon from "@/components/Icon";
import { practiceTarget } from "@/lib/nav";
import { useCatalog } from "@/lib/catalog";
import { useApp } from "@/lib/store";

type Filter = "todas" | "dominadas" | "practica" | "nuevas";
const TIPO = { estatica: "Estática", dinamica: "Con movimiento", ubicacion: "Con ubicación" } as const;

export default function ProgressPage() {
  const { signs: SIGNS } = useCatalog();
  const { stats, progress } = useApp();
  const [filter, setFilter] = useState<Filter>("todas");
  const lvl = stats.level;
  const toNext = lvl.next ? lvl.next - stats.xp : 0;
  const status = (id: string) => (progress.signs[id]?.mastered ? "dominadas" : progress.signs[id]?.seen ? "practica" : "nuevas") as Filter;
  const counts = { todas: SIGNS.length, dominadas: SIGNS.filter(s => status(s.id) === "dominadas").length, practica: SIGNS.filter(s => status(s.id) === "practica").length, nuevas: SIGNS.filter(s => status(s.id) === "nuevas").length };
  const list = SIGNS.filter(s => filter === "todas" || status(s.id) === filter);
  const target = practiceTarget(progress);
  const tabs: { id: Filter; label: string }[] = [
    { id: "todas", label: `Todas (${counts.todas})` }, { id: "dominadas", label: `Dominadas (${counts.dominadas})` },
    { id: "practica", label: `En práctica (${counts.practica})` }, { id: "nuevas", label: `Nuevas (${counts.nuevas})` },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-space-xl px-margin py-space-lg md:px-margin-tablet lg:px-margin-desktop">
      <section className="flex flex-col justify-between gap-space-lg lg:flex-row lg:items-start">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-space-xs rounded-full bg-primary-fixed px-space-sm py-1 font-label-sm text-label-sm uppercase text-on-primary-fixed"><Icon name="monitoring" className="text-base" /> Panel de dominio LESSA</span>
          <h1 className="mt-space-sm font-headline-xl-mobile text-headline-xl-mobile tracking-tight md:font-headline-xl md:text-headline-xl">Tu progreso en LESSA</h1>
          <p className="mt-space-xs font-body-lg text-body-lg text-on-surface-variant">Cada seña que aprendés suma. Seguí metiéndole ganas, que ya se nota el cambio.</p>
        </div>
        <div className="card-surface w-full max-w-md p-space-md">
          <div className="flex items-center gap-space-sm">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-container text-on-primary"><Icon name="handshake" fill /></span>
            <div className="flex-1">
              <div className="font-label-sm text-label-sm uppercase text-on-surface-variant">Tu nivel</div>
              <div className="font-headline-sm text-headline-sm">Nivel {lvl.n}: {lvl.name}</div>
            </div>
            <span className="rounded bg-secondary-container px-2 py-0.5 font-label-sm text-xs text-on-secondary-fixed-variant">Activo</span>
          </div>
          <p className="mt-space-sm font-body-sm text-body-sm text-on-surface-variant">{lvl.next ? <>Te faltan <b className="text-on-surface">{toNext} XP</b> para el nivel {lvl.n + 1}.</> : "¡Llegaste al nivel máximo!"}</p>
          <div className="mt-space-xs h-2 overflow-hidden rounded-full bg-surface-container-high"><div className="h-full rounded-full bg-primary-container transition-all duration-700" style={{ width: `${lvl.progress * 100}%` }} /></div>
          <div className="mt-1 flex justify-between font-label-sm text-xs text-on-surface-variant"><span>{lvl.min} XP</span><span>{stats.xp}{lvl.next ? ` / ${lvl.next}` : ""} XP</span></div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-4" aria-label="Resumen">
        <div className="card-surface p-space-md">
          <div className="flex items-center justify-between"><span className="font-label-md text-label-md text-on-surface-variant">Racha actual</span><span className="grid h-9 w-9 place-items-center rounded-full bg-tertiary-fixed text-tertiary"><Icon name="local_fire_department" fill /></span></div>
          <div className="mt-space-sm font-headline-xl text-headline-xl text-tertiary">{stats.streak} <span className="font-headline-sm text-headline-sm font-medium text-on-surface-variant">{stats.streak === 1 ? "día" : "días"}</span></div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">{stats.bestStreak > 0 ? `Tu récord: ${stats.bestStreak} ${stats.bestStreak === 1 ? "día" : "días"} seguidos.` : "Practicá hoy para empezar tu racha."}</p>
        </div>
        <div className="card-surface p-space-md">
          <div className="flex items-center justify-between"><span className="font-label-md text-label-md text-on-surface-variant">Señas dominadas</span><span className="grid h-9 w-9 place-items-center rounded-full bg-primary-fixed text-primary"><Icon name="sign_language" /></span></div>
          <div className="mt-space-sm font-headline-xl text-headline-xl text-primary">{stats.mastered} <span className="font-headline-sm text-headline-sm font-medium text-on-surface-variant">/ {stats.totalSigns}</span></div>
          <div className="mt-space-xs h-2 overflow-hidden rounded-full bg-surface-container-high"><div className="h-full rounded-full bg-primary-container" style={{ width: `${(stats.mastered / stats.totalSigns) * 100}%` }} /></div>
        </div>
        <div className="card-surface p-space-md">
          <div className="flex items-center justify-between"><span className="font-label-md text-label-md text-on-surface-variant">Similitud promedio</span><span className="grid h-9 w-9 place-items-center rounded-full bg-secondary-container text-secondary"><Icon name="target" /></span></div>
          <div className="mt-space-sm font-headline-xl text-headline-xl text-secondary">{stats.avgScore !== null ? `${stats.avgScore}%` : "—"}</div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">{stats.avgScore !== null ? "En las señas que ya calificaste con cámara." : "Aparece cuando califiques tu primera seña."}</p>
        </div>
        <div className="card-surface p-space-md">
          <div className="flex items-center justify-between"><span className="font-label-md text-label-md text-on-surface-variant">Puntos XP</span><span className="grid h-9 w-9 place-items-center rounded-full bg-primary-fixed text-primary"><Icon name="bolt" fill /></span></div>
          <div className="mt-space-sm font-headline-xl text-headline-xl">{stats.xp.toLocaleString("es-SV")} <span className="font-headline-sm text-headline-sm font-medium text-on-surface-variant">XP</span></div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">{stats.xpToday > 0 ? `Ganaste ${stats.xpToday} XP hoy.` : "Todavía no sumaste XP hoy."}</p>
        </div>
      </section>

      <section className="card-surface p-space-lg">
        <div className="flex flex-col justify-between gap-space-sm sm:flex-row sm:items-center">
          <div><h2 className="flex items-center gap-space-sm font-headline-sm text-headline-sm"><Icon name="calendar_month" className="text-on-surface-variant" /> Consistencia de la semana</h2><p className="font-body-sm text-body-sm text-on-surface-variant">Abrí o practicá al menos una seña al día para cuidar tu fuego.</p></div>
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-low px-space-md py-space-xs font-label-sm text-label-sm text-on-surface-variant"><Icon name="flag" className="text-base" /> Meta diaria: {stats.dailyGoal} señas</span>
        </div>
        <div className="mt-space-md grid grid-cols-7 gap-space-xs sm:gap-space-sm">
          {stats.week.map(d => {
            const done = d.state === "done" || d.state === "today-done";
            const today = d.state === "today" || d.state === "today-done";
            return (
              <div key={d.date} className={`relative flex flex-col items-center gap-1 rounded-xl px-1 py-space-sm ${today ? "bg-primary-fixed" : done ? "bg-surface-container-low" : ""}`}>
                {today && <span className="absolute -top-2 rounded-full bg-tertiary-container px-2 py-0.5 font-label-sm text-[10px] text-on-tertiary-container">HOY</span>}
                <span className="font-label-sm text-label-sm text-on-surface-variant">{d.label}</span>
                <span className={`grid h-9 w-9 place-items-center rounded-full ${done ? "bg-secondary text-on-secondary" : today ? "bg-tertiary-fixed text-tertiary" : "bg-surface-container-high text-outline"}`}>
                  <Icon name={done ? "check" : today ? "local_fire_department" : d.state === "missed" ? "remove" : "schedule"} fill={today && !done} className="text-lg" />
                </span>
                <span className="font-label-sm text-[11px] text-on-surface-variant">{done ? (d.avgScore !== null ? `${d.avgScore}%` : "¡Hecho!") : today ? "¡Hoy!" : d.state === "missed" ? "—" : "Próx."}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <span className="font-label-sm text-label-sm font-bold uppercase tracking-wider text-primary">Vocabulario activo</span>
        <div className="flex flex-col justify-between gap-space-sm md:flex-row md:items-end">
          <div><h2 className="font-headline-lg text-headline-lg">Catálogo de señas</h2><p className="font-body-md text-body-md text-on-surface-variant">Revisá cómo vas en cada seña. Repasá las que todavía no dominás.</p></div>
          <div className="flex gap-1 overflow-x-auto rounded-full bg-surface-container p-1" role="tablist" aria-label="Filtrar señas">
            {tabs.map(t => (
              <button key={t.id} role="tab" aria-selected={filter === t.id} onClick={() => setFilter(t.id)} className={`whitespace-nowrap rounded-full px-space-md py-space-xs font-label-sm text-label-sm transition-all ${filter === t.id ? "bg-primary-container text-on-primary" : "text-on-surface-variant hover:text-on-surface"}`}>{t.label}</button>
            ))}
          </div>
        </div>
        <div className="mt-space-md grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-4">
          {list.map(s => {
            const sp = progress.signs[s.id]; const st = status(s.id);
            return (
              <article key={s.id} className="card-surface overflow-hidden">
                <div className="relative grid h-36 place-items-center bg-gradient-to-br from-primary-fixed to-surface-container">
                  <span className="px-2 text-center font-headline-lg text-headline-lg text-primary">{s.glosa}</span>
                  <span className={`absolute right-space-sm top-space-sm rounded-full px-space-sm py-0.5 font-label-sm text-xs ${st === "dominadas" ? "bg-secondary text-on-secondary" : st === "practica" ? "bg-tertiary-fixed text-on-tertiary-fixed" : "bg-surface-container-lowest text-on-surface-variant"}`}>{st === "dominadas" ? "Dominada" : st === "practica" ? "En práctica" : "Nueva"}</span>
                </div>
                <div className="flex items-center justify-between gap-space-sm p-space-md">
                  <div className="min-w-0"><h3 className="truncate font-label-lg text-label-lg">{s.significado}</h3><p className="font-body-sm text-body-sm text-on-surface-variant">{TIPO[s.tipo]}</p></div>
                  {sp && sp.bestScore > 0 && <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full ring-4 ring-inset ring-secondary/80 font-label-sm text-[11px] text-secondary">{sp.bestScore}%</span>}
                </div>
                <div className="px-space-md pb-space-md">
                  <Link href={st === "dominadas" ? `/app/sena/${s.id}` : s.tipo === "estatica" ? `/app/practica/${s.id}` : `/app/sena/${s.id}`}
                    className={`flex h-10 w-full items-center justify-center gap-space-xs rounded-lg font-label-md text-label-md ${st === "dominadas" ? "bg-primary-fixed text-primary hover:brightness-95" : "bg-primary-container text-on-primary hover:brightness-110"}`}>
                    <Icon name={st === "dominadas" ? "videocam" : s.tipo === "estatica" ? "videocam" : "school"} className="text-lg" />
                    {st === "dominadas" ? "Repasar" : s.tipo === "estatica" ? "Entrenar con cámara" : st === "nuevas" ? "Ver la seña" : "Seguir practicando"}
                  </Link>
                </div>
              </article>
            );
          })}
          {list.length === 0 && <p className="col-span-full rounded-xl bg-surface-container-low p-space-lg text-center font-body-md text-on-surface-variant">No hay señas en este filtro todavía.</p>}
        </div>
      </section>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-700 to-primary-container p-space-lg text-on-primary md:p-space-xl">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10" />
        <div className="relative flex flex-col items-start justify-between gap-space-md md:flex-row md:items-center">
          <div className="max-w-xl">
            <span className="font-label-sm text-label-sm uppercase opacity-80">¡Ponete las pilas!</span>
            <h2 className="mt-1 font-headline-lg text-headline-lg">{stats.mastered === stats.totalSigns ? "¡Dominaste todo el vocabulario!" : "Seguí sumando señas dominadas"}</h2>
            <p className="mt-1 font-body-md text-body-md opacity-90">Una sesión corta frente a la cámara con retroalimentación en tiempo real te acerca a la siguiente seña.</p>
          </div>
          <Link href={`/app/practica/${target.id}`} className="shrink-0 rounded-xl bg-surface-container-lowest px-space-lg py-space-md font-label-lg text-label-lg text-primary shadow-lg transition-transform hover:scale-[1.02]">Practicar con cámara</Link>
        </div>
      </section>
    </div>
  );
}
