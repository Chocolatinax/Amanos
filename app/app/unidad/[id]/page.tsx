"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useProgress } from "@/components/AppShell";
import { getUnit, getSign } from "@/lib/signs";

export default function UnitPage() {
  const { id } = useParams<{ id: string }>();
  const unit = getUnit(id);
  const [p] = useProgress();
  if (!unit) return <p>Unidad no encontrada.</p>;
  if (!p) return null;
  return (
    <div>
      <Link href="/app" className="text-sm text-slate-500">← Inicio</Link>
      <h1 className="mt-2 text-2xl font-black">{unit.nombre}</h1>
      <p className="text-slate-600">{unit.descripcion}</p>
      <ol className="mt-6 space-y-2">
        {unit.signIds.map((sid, i) => {
          const s = getSign(sid)!; const sp = p.signs[sid];
          const status = sp?.mastered ? { t: "Dominada", c: "text-green-700 bg-green-50" } : sp?.seen ? { t: "Vista", c: "text-brand-700 bg-brand-50" } : { t: "Nueva", c: "text-slate-500 bg-slate-100" };
          return (
            <li key={sid}>
              <Link href={`/app/sena/${sid}`} className="card flex items-center gap-4 py-4 hover:ring-brand-500">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-slate-900 text-xl font-black text-white">{s.glosa}</div>
                <div className="flex-1">
                  <div className="font-semibold">{s.significado}</div>
                  <div className="text-xs text-slate-500">{s.descripcion.configuracionMano}</div>
                </div>
                <div className="text-right">
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${status.c}`}>{status.t}</span>
                  {sp?.bestScore ? <div className="mt-1 text-xs text-slate-500">mejor {sp.bestScore}%</div> : null}
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
