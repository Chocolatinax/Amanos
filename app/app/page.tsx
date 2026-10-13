"use client";
import Link from "next/link";
import { useProgress } from "@/components/AppShell";
import { SIGNS, UNITS } from "@/lib/signs";
import { resetProgress } from "@/lib/progress";

export default function Dashboard() {
  const [p, setP] = useProgress();
  if (!p) return null;
  const total = SIGNS.length;
  const mastered = SIGNS.filter(s => p.signs[s.id]?.mastered).length;
  const seen = SIGNS.filter(s => p.signs[s.id]?.seen).length;
  const pct = Math.round((mastered / total) * 100);
  const next = SIGNS.find(s => !p.signs[s.id]?.mastered);

  return (
    <div className="space-y-6">
      <section className="card">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-slate-500">Tu progreso</p>
            <h1 className="text-3xl font-black">{mastered} <span className="text-lg font-semibold text-slate-400">/ {total} señas dominadas</span></h1>
          </div>
          <div className="text-right text-sm text-slate-500">{seen} vistas · racha 🔥 {p.streak}</div>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-green-600 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-xs text-slate-500">Dominada = la cámara validó la seña al 90% o más.</p>
        {next && (
          <Link href={`/app/sena/${next.id}`} className="btn-primary mt-5 w-full md:w-auto">Continuar: {next.glosa}</Link>
        )}
        {!next && <p className="mt-5 font-semibold text-green-700">¡Unidad 1 completa! 🎉</p>}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">Unidades</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {UNITS.map((u, i) => {
            const done = u.signIds.filter(id => p.signs[id]?.mastered).length;
            const locked = u.signIds.length === 0;
            const inner = (
              <div className={`card h-full ${locked ? "opacity-50" : "hover:ring-brand-500"}`}>
                <div className="text-xs font-semibold uppercase text-slate-400">Unidad {u.id}</div>
                <div className="mt-1 font-bold">{u.nombre.replace(/^Unidad \d+: /, "")}</div>
                <div className="mt-2 text-sm text-slate-500">{locked ? "🔒 Próximamente" : `${done}/${u.signIds.length} dominadas`}</div>
              </div>
            );
            return locked ? <div key={u.id}>{inner}</div> : <Link key={u.id} href={`/app/unidad/${u.id}`}>{inner}</Link>;
          })}
        </div>
      </section>

      <section className="card">
        <h2 className="font-bold">Señas de la Unidad 1</h2>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {SIGNS.map(s => {
            const sp = p.signs[s.id];
            const cls = sp?.mastered ? "bg-green-600 text-white" : sp?.seen ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-500";
            return (
              <Link key={s.id} href={`/app/sena/${s.id}`} className={`grid aspect-square place-items-center rounded-xl text-lg font-black ${cls}`} title={`${s.significado}${sp ? ` · mejor ${sp.bestScore}%` : ""}`}>
                {s.glosa}
              </Link>
            );
          })}
        </div>
      </section>

      <button onClick={() => { resetProgress(); setP(null); location.reload(); }} className="text-xs text-slate-400 hover:text-slate-600">Reiniciar progreso (demo)</button>
    </div>
  );
}
